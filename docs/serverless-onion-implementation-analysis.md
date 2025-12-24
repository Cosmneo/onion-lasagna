# serverless-onion: Implementation Deep Dive

This document analyzes the **implementation-level differences** between the AWS API Gateway HTTP and Cloudflare Workers runtimes. While both share the same core abstractions, their adapters reveal fundamental differences in how each platform handles HTTP primitives.

---

## 1. Request Body Parsing

The most significant implementation difference lies in how request bodies are accessed.

### AWS: Synchronous String Access

```typescript
// aws-api-gateway-http/adapters/request/map-request-body.ts
export function mapRequestBody(event: APIGatewayProxyEventV2): unknown {
  if (!event.body) {
    return undefined;
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return event.body;
  }
}
```

**Key observations:**

- **Synchronous function** - body is immediately available
- Body arrives as a **pre-buffered string** in `event.body`
- No content-type checking - blindly attempts JSON parse
- Falls back to raw string on parse failure
- No base64 handling in current implementation (API Gateway v2 auto-decodes)

### Cloudflare: Async Stream-Based

```typescript
// cloudflare-workers/adapters/request/map-request-body.ts
export async function mapRequestBody(request: Request): Promise<unknown> {
  if (!request.body) {
    return undefined;
  }

  const clonedRequest = request.clone();
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await clonedRequest.json();
    } catch {
      return await request.clone().text();
    }
  }

  const text = await clonedRequest.text();
  return text.length > 0 ? text : undefined;
}
```

**Key observations:**

- **Async function** - body is a readable stream
- **Must clone request** before reading (streams can only be read once)
- **Content-type aware** - checks header before parsing
- Uses Web API methods: `request.json()`, `request.text()`
- Double-clone on JSON parse failure (each read consumes the stream)

### Why This Matters

| Aspect             | AWS                                       | Cloudflare                           |
| ------------------ | ----------------------------------------- | ------------------------------------ |
| Memory model       | Body pre-loaded into Lambda memory        | Body streamed on demand              |
| Large payloads     | Entire body in memory before handler runs | Can stream/chunk large bodies        |
| Parse attempts     | Always tries JSON                         | Checks content-type first            |
| Function signature | Sync                                      | Async (propagates up the call chain) |

The Cloudflare approach is more memory-efficient for large payloads but requires careful stream management.

---

## 2. Headers Access Pattern

### AWS: Nullable Plain Object

```typescript
// aws-api-gateway-http/adapters/request/map-request-headers.ts
export function mapRequestHeaders(
  event: APIGatewayProxyEventV2,
): Record<string, string> | undefined {
  if (!event.headers) {
    return undefined;
  }

  const filtered: Record<string, string> = {};

  for (const [key, value] of Object.entries(event.headers)) {
    if (value !== undefined) {
      filtered[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}
```

**Key observations:**

- Headers come as `Record<string, string | undefined>` (note the `undefined`)
- Must filter out undefined values
- Returns `undefined` if no valid headers exist
- Uses `Object.entries()` for iteration

### Cloudflare: Headers Object

```typescript
// cloudflare-workers/adapters/request/map-request-headers.ts
export function mapRequestHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};

  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return headers;
}
```

**Key observations:**

- Headers are a `Headers` object (Web API standard)
- Uses `.forEach()` callback pattern (note: value comes before key)
- **Always returns an object** - never undefined
- No filtering needed - Headers API guarantees non-undefined values
- Simpler implementation due to Web API guarantees

### The Subtle `.forEach()` Gotcha

```typescript
// Headers.forEach has (value, key) order - opposite of Object.entries!
request.headers.forEach((value, key) => { ... });

// vs Map/Object iteration which is (key, value)
Object.entries(obj).forEach(([key, value]) => { ... });
```

---

## 3. Query Parameter Extraction

### AWS: Pre-Parsed Object

```typescript
// aws-api-gateway-http/adapters/request/map-request-query-params.ts
export function mapRequestQueryParams(
  event: APIGatewayProxyEventV2,
): Record<string, string> | undefined {
  if (!event.queryStringParameters) {
    return undefined;
  }

  const filtered: Record<string, string> = {};

  for (const [key, value] of Object.entries(event.queryStringParameters)) {
    if (value !== undefined) {
      filtered[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}
```

**Key observations:**

- API Gateway **pre-parses** query string into `event.queryStringParameters`
- Same undefined-filtering pattern as headers
- Multi-value params are comma-joined by API Gateway before reaching Lambda

### Cloudflare: URL Parsing Required

```typescript
// cloudflare-workers/adapters/request/map-request-query-params.ts
export function mapRequestQueryParams(request: Request): Record<string, string> | undefined {
  const url = new URL(request.url);

  if (url.searchParams.size === 0) {
    return undefined;
  }

  const params: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}
```

**Key observations:**

- **Must parse URL manually** - no pre-parsed params
- Uses `URLSearchParams` API (Web standard)
- `.size` property for emptiness check (modern API)
- Same `.forEach((value, key))` pattern as Headers
- Multi-value handling: last value wins (URLSearchParams behavior)

### Performance Implication

```typescript
// Cloudflare must construct URL object every time
const url = new URL(request.url); // String parsing + object allocation

// AWS already has parsed params
event.queryStringParameters; // Direct property access
```

The URL parsing in Cloudflare adds overhead, but it's negligible for most use cases.

---

## 4. Path Parameter Handling

This reveals a fundamental architectural difference.

### AWS: Platform-Provided (Sometimes)

```typescript
// aws-api-gateway-http/adapters/request/map-request-path-params.ts
export function mapRequestPathParams(
  event: APIGatewayProxyEventV2,
): Record<string, string> | undefined {
  if (!event.pathParameters) {
    return undefined;
  }

  const filtered: Record<string, string> = {};

  for (const [key, value] of Object.entries(event.pathParameters)) {
    if (value !== undefined) {
      filtered[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}
```

**But** for greedy proxy routes (`/{proxy+}`), path params must be extracted by the routing system:

```typescript
// aws-api-gateway-http/handlers/create-greedy-proxy-handler.ts
function mapGreedyProxyRequest(event, resolved) {
  return {
    body: mapRequestBody(event),
    queryParams: mapRequestQueryParams(event),
    pathParams: resolved.pathParams, // From routing, not event
    headers: mapRequestHeaders(event),
  };
}
```

### Cloudflare: Always Routing-Extracted

```typescript
// cloudflare-workers/adapters/request/map-request.ts
export async function mapRequest(request: Request): Promise<HttpRequest> {
  return {
    body: await mapRequestBody(request),
    headers: mapRequestHeaders(request),
    pathParams: undefined, // Always from routing system
    queryParams: mapRequestQueryParams(request),
  };
}
```

**Cloudflare never has path params from the platform** - Workers receive the raw URL and the routing system extracts params:

```typescript
// cloudflare-workers/handlers/create-worker-proxy-handler.ts
async function mapWorkerProxyRequest(request, resolved) {
  return {
    body: await mapRequestBody(request),
    queryParams: mapRequestQueryParams(request),
    pathParams: resolved.pathParams, // Always from routing
    headers: mapRequestHeaders(request),
  };
}
```

### The Routing System (Shared Core)

Both platforms use the same core routing implementation for multi-route handlers:

```typescript
// core/routing/create-routing-map.ts
export function extractPathParams(route, path): Record<string, string> {
  const match = route.pattern.exec(path);

  if (match?.groups && Object.keys(match.groups).length > 0) {
    return Object.fromEntries(
      Object.entries(match.groups).filter(([, v]) => typeof v === 'string'),
    );
  }

  // Fallback for older runtimes without named groups
  const capturedValues = match.slice(1);
  return Object.fromEntries(route.paramNames.map((name, i) => [name, capturedValues[i]]));
}
```

---

## 5. Response Construction

### AWS: Plain Object Return

```typescript
// aws-api-gateway-http/adapters/response/map-response.ts
export function mapResponse(response: HttpResponse): APIGatewayProxyResultV2 {
  const hasBody = response.body !== undefined && response.body !== null;

  return {
    statusCode: response.statusCode,
    body: mapResponseBody(response.body),
    headers: mapResponseHeaders(response.headers, { includeBaseHeaders, hasBody }),
  };
}

// aws-api-gateway-http/adapters/response/map-response-body.ts
export function mapResponseBody(body: unknown): string {
  if (body === undefined || body === null) {
    return '';
  }
  return JSON.stringify(body); // Always stringify, even strings
}
```

**Key observations:**

- Returns a **plain object** - Lambda runtime serializes it
- Body **must be a string** - even strings get JSON.stringify'd
- Response structure matches `APIGatewayProxyResultV2` interface

### Cloudflare: Response Constructor

```typescript
// cloudflare-workers/adapters/response/map-response.ts
export function mapResponse(response: HttpResponse): Response {
  const body = mapResponseBody(response.body);
  const headers = mapResponseHeaders(response.headers, {
    includeBaseHeaders,
    hasBody: body !== '',
  });

  return new Response(body, {
    status: response.statusCode,
    headers,
  });
}

// cloudflare-workers/adapters/response/map-response-body.ts
export function mapResponseBody(body: unknown): string {
  if (body === undefined || body === null) {
    return '';
  }

  if (typeof body === 'string') {
    return body; // Strings pass through unchanged
  }

  return JSON.stringify(body);
}
```

**Key observations:**

- Uses **`new Response()`** constructor (Web API)
- Strings are **not double-encoded** - passed through as-is
- More efficient for text/html responses

### String Handling Difference

```typescript
// AWS: strings get JSON-encoded
mapResponseBody('hello'); // → '"hello"' (with quotes!)

// Cloudflare: strings pass through
mapResponseBody('hello'); // → 'hello' (no quotes)
```

This means AWS always returns JSON, while Cloudflare can return plain text.

---

## 6. Response Headers Typing

### AWS: Loose Typing

```typescript
// aws-api-gateway-http/adapters/response/map-response-headers.ts
export function mapResponseHeaders(
  headers: Record<string, unknown> | undefined,
  options: MapResponseHeadersOptions = {},
): Record<string, string | number | boolean> {
  return {
    ...(includeBaseHeaders && BASE_HEADERS),
    ...(hasBody && { 'Content-Type': 'application/json' }),
    ...((headers ?? {}) as Record<string, string | number | boolean>),
  };
}
```

**Allows `number` and `boolean` values** - API Gateway coerces them to strings.

### Cloudflare: Strict String Typing

```typescript
// cloudflare-workers/adapters/response/map-response-headers.ts
export function mapResponseHeaders(
  headers: Record<string, unknown> | undefined,
  options: MapResponseHeadersOptions = {},
): Record<string, string> {
  const result: Record<string, string> = {};

  if (includeBaseHeaders) {
    Object.assign(result, BASE_HEADERS);
  }

  if (hasBody) {
    result['Content-Type'] = 'application/json';
  }

  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value); // Explicit conversion
      }
    }
  }

  return result;
}
```

**Key observations:**

- **Explicitly converts values to strings** via `String(value)`
- Filters out `undefined` and `null` values
- More defensive implementation

---

## 7. Exception Handler Wrapper

### AWS: Must Handle Lambda Callback

```typescript
// aws-api-gateway-http/wrappers/with-exception-handler.ts
export function withExceptionHandler(handler: APIGatewayProxyHandlerV2): APIGatewayProxyHandlerV2 {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<APIGatewayProxyResultV2> => {
    try {
      const result = await handler(event, context, () => {}); // Fake callback!
      return result ?? { statusCode: 204, body: '' };
    } catch (error: unknown) {
      // ... exception handling
    }
  };
}
```

**The `() => {}` is a hack!** Lambda v2 handlers are typed to accept a callback as the third parameter (legacy from v1), even though async handlers don't use it. The wrapper must provide a no-op callback.

### Cloudflare: Clean Wrapper

```typescript
// cloudflare-workers/wrappers/with-exception-handler.ts
export function withExceptionHandler<TEnv extends WorkerEnv>(
  handler: WorkerHandler<TEnv>,
): WorkerHandler<TEnv> {
  return async (request, env, ctx) => {
    try {
      return await handler(request, env, ctx);
    } catch (error: unknown) {
      // ... exception handling
    }
  };
}
```

**Key observations:**

- **No callback gymnastics** - Workers use a clean async model
- **Generic over environment** - type-safe env bindings
- Simpler implementation

---

## 8. Handler Factory Patterns

### AWS: Sync Input Mapping

```typescript
// aws-api-gateway-http/handlers/create-lambda-handler.ts
export function createLambdaHandler<TInput, TOutput>(
  config: CreateLambdaHandlerConfig<TInput, TOutput>,
): APIGatewayProxyHandlerV2 {
  const {
    mapInput = (event) => mapRequest(event) as TInput, // Sync!
    mapOutput = (output) => output as unknown as HttpResponse,
    handleWarmup = true,
    handleExceptions = true,
  } = config;

  const coreHandler = async (event) => {
    if (handleWarmup && isWarmupCall(event)) {
      return getWarmupResponse();
    }

    const input = mapInput(event); // Sync call
    const output = await controller.execute(input);
    return mapResponse(mapOutput(output));
  };

  return handleExceptions ? withExceptionHandler(coreHandler) : coreHandler;
}
```

**Key observations:**

- `mapInput` is **synchronous** (no `await`)
- Has **warmup handling** built-in
- No middleware support - just input/output mapping

### Cloudflare: Async Input with Middleware Chain

```typescript
// cloudflare-workers/handlers/create-worker-handler.ts
export function createWorkerHandler<TInput, TOutput, TMiddlewares, TEnv>(
  config: CreateWorkerHandlerConfig<TInput, TOutput, TMiddlewares, TEnv>,
): WorkerHandler<TEnv> {
  const {
    middlewares = [],
    mapInput = async (request) => (await mapRequest(request)) as TInput, // Async!
    mapOutput = (output) => {
      /* ... */
    },
    handleExceptions = true,
  } = config;

  const coreHandler = async (request, env, ctx) => {
    // Run middleware chain
    let middlewareContext;
    if (middlewares.length > 0) {
      middlewareContext = await runMiddlewareChain(request, env, middlewares);
    }

    // Async input mapping with middleware context
    const input = await mapInput(request, env, ctx, middlewareContext);
    const output = await controller.execute(input);
    return mapResponse(mapOutput(output));
  };

  return handleExceptions ? withExceptionHandler(coreHandler) : coreHandler;
}
```

**Key observations:**

- `mapInput` is **async** (body parsing propagates)
- **Middleware chain** runs before input mapping
- Middleware context is **passed to `mapInput`** for access
- **No warmup handling** - Workers don't need it

---

## 9. Context Extraction Philosophy

This is the most significant architectural difference.

### AWS: Single Context Function

```typescript
// aws-api-gateway-http/handlers/create-greedy-proxy-handler.ts
interface CreateGreedyProxyHandlerConfig<TController, TContext> {
  mapExecutionContext?: (event: APIGatewayProxyEventV2) => TContext;
}

// Usage
createGreedyProxyHandler({
  mapExecutionContext: (event) => ({
    userId: event.requestContext.authorizer?.lambda?.userId,
    tenantId: event.requestContext.authorizer?.lambda?.tenantId,
  }),
});
```

**Key observations:**

- **Single function** extracts all context at once
- **No type safety** between context dependencies
- Context typically comes from **Lambda authorizer** (separate function)
- **Sync function** - no async context loading

### Cloudflare: Accumulated Middleware Chain

```typescript
// core/middleware/types/middleware.type.ts
export type Middleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv = unknown,
> = (request: Request, env: TEnv, ctx: TRequiredContext) => Promise<TOutput>;

// cloudflare-workers/handlers/create-worker-proxy-handler.ts
interface CreateWorkerProxyHandlerConfig<TController, TMiddlewares, TEnv> {
  middlewares?: TMiddlewares;
}

// Usage
createWorkerProxyHandler({
  middlewares: [
    authMiddleware, // Returns AuthContext
    tenantMiddleware, // Receives AuthContext, returns TenantContext
  ] as const,
  // Controller receives: AuthContext & TenantContext
});
```

**Key observations:**

- **Chain of middlewares**, each building on previous context
- **Type-safe dependencies** - middleware can require previous context
- **Async middlewares** - can fetch from KV, D1, etc.
- Context accumulates via intersection types

### The Middleware Chain Implementation

```typescript
// core/middleware/run-middleware-chain.ts
export async function runMiddlewareChain<TMiddlewares, TEnv>(
  request: Request,
  env: TEnv,
  middlewares: TMiddlewares,
): Promise<AccumulatedContext<TMiddlewares, TEnv>> {
  let accumulatedContext: object = {};

  for (const middleware of middlewares) {
    const middlewareContext = await middleware(request, env, accumulatedContext);
    accumulatedContext = { ...accumulatedContext, ...middlewareContext };
  }

  return accumulatedContext;
}
```

**Key observations:**

- Sequential execution (order matters)
- Each middleware receives **all previous context**
- Final context is **union of all middleware outputs**
- Any middleware can **throw to abort** (caught by exception handler)

---

## 10. Request Metadata Richness

### AWS: Rich Gateway Metadata

```typescript
// aws-api-gateway-http/handlers/create-greedy-proxy-handler.ts
interface RequestMetadata {
  path: string; // event.rawPath
  method: string; // event.requestContext.http.method
  requestId: string; // event.requestContext.requestId
  sourceIp: string; // event.requestContext.http.sourceIp
  userAgent: string; // event.requestContext.http.userAgent
}
```

API Gateway provides a wealth of metadata from its processing:

- Unique request ID for tracing
- Client IP (even through CloudFront)
- User agent string
- Stage, domain, account ID, etc.

### Cloudflare: Minimal Standard Metadata

```typescript
// cloudflare-workers/handlers/create-worker-proxy-handler.ts
interface RequestMetadata {
  path: string; // new URL(request.url).pathname
  method: string; // request.method
  url: string; // request.url
}
```

**But** Cloudflare provides extra data via `request.cf`:

```typescript
// Available but not in our standard metadata
request.cf.country; // ISO country code
request.cf.city; // City name
request.cf.colo; // Cloudflare datacenter
request.cf.tlsVersion; // TLS version
request.cf.asn; // Autonomous System Number
```

---

## 11. Platform-Specific Features

### AWS-Only: Warmup Handling

```typescript
// aws-api-gateway-http/features/warmup/is-warmup-call.ts
export function isWarmupCall(event: APIGatewayProxyEventV2): boolean {
  try {
    const body = JSON.parse(event.body || '{}');
    return body.source === 'serverless-plugin-warmup';
  } catch {
    return false;
  }
}
```

Lambda cold starts are a real issue; warmup plugins periodically invoke functions to keep them warm. Workers don't have this problem - they're always-on at the edge.

### AWS-Only: Authorizer Payload System

```typescript
// aws-api-gateway-http/features/authorizer/create-authorizer-payload.ts
export function createAuthorizerPayload<T extends object>(payload: T): string {
  return JSON.stringify(payload);
}

// aws-api-gateway-http/features/authorizer/map-authorizer-payload.ts
export function mapAuthorizerPayload<T>(event: APIGatewayProxyEventV2): T | null {
  const authorizer = event.requestContext?.authorizer?.lambda;
  const payload = authorizer?.authorizerPayload;

  if (!payload || typeof payload !== 'string') return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
```

AWS API Gateway has a **separate authorizer Lambda** that runs before your main Lambda. The authorizer can pass context via a JSON-encoded string (workaround for API Gateway's string-only context limitation).

### Cloudflare-Only: Environment Bindings

```typescript
// cloudflare-workers/types/worker-handler.type.ts
export type WorkerEnv = Record<string, unknown>;

export type WorkerHandler<TEnv extends WorkerEnv = WorkerEnv> = (
  request: Request,
  env: TEnv, // Typed bindings!
  ctx: WorkerContext,
) => Promise<Response>;
```

Cloudflare passes bindings (KV, D1, R2, Durable Objects, secrets) as a typed `env` parameter. This is fundamentally different from Lambda's environment variables.

### Cloudflare-Only: Execution Context

```typescript
// cloudflare-workers/types/worker-handler.type.ts
export interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
```

- `waitUntil()` - Keep worker alive after response for background tasks
- `passThroughOnException()` - Fall back to origin on error (for proxies)

Lambda has no equivalent - once you return, the function may be frozen.

---

## 12. Type System Differences

### AWS: Simple Generics

```typescript
export function createLambdaHandler<TInput, TOutput>(
  config: CreateLambdaHandlerConfig<TInput, TOutput>,
): APIGatewayProxyHandlerV2;
```

Two type parameters: input and output. Context is untyped.

### Cloudflare: Advanced Generic Constraints

```typescript
export function createWorkerHandler<
  TInput,
  TOutput,
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
  TEnv extends WorkerEnv = WorkerEnv,
>(config: CreateWorkerHandlerConfig<TInput, TOutput, TMiddlewares, TEnv>): WorkerHandler<TEnv>;
```

Four type parameters with constraints:

- `TMiddlewares` - Tuple of middlewares (requires `as const`)
- `TEnv` - Environment bindings type
- Middleware chain context is **computed type** via `AccumulatedContext`

### The AccumulatedContext Type

```typescript
// core/middleware/types/middleware-chain.type.ts
export type AccumulatedContext<
  TMiddlewares extends readonly Middleware<object, object, TEnv, TRequest>[],
  TEnv = unknown,
  TRequest = Request,
> = TMiddlewares extends readonly [
  Middleware<infer TFirst, object, TEnv, TRequest>,
  ...infer TRest extends readonly Middleware<object, object, TEnv, TRequest>[],
]
  ? TFirst & AccumulatedContext<TRest, TEnv, TRequest>
  : object;
```

This recursive type extracts the output type from each middleware and intersects them. TypeScript magic!

---

## Summary: Implementation Philosophy

| Aspect                | AWS Lambda                 | Cloudflare Workers           |
| --------------------- | -------------------------- | ---------------------------- |
| **Request model**     | Pre-parsed event object    | Raw Request stream           |
| **Response model**    | Plain object               | Response constructor         |
| **Async nature**      | Sync request parsing       | Async throughout             |
| **Context pattern**   | Single extraction function | Accumulated middleware chain |
| **Type complexity**   | Simple generics            | Advanced recursive types     |
| **Platform features** | Warmup, authorizers        | Bindings, waitUntil          |
| **Execution model**   | Cold start / warm          | Always-on edge               |
| **String handling**   | Always JSON-encoded        | Pass-through for strings     |

The AWS implementation is **simpler and more pragmatic** - it works with what API Gateway provides. The Cloudflare implementation is **more sophisticated** - it embraces Web standards and provides advanced type-safe patterns.

Both implementations share the same core (routing, exceptions, error mapping), demonstrating that the fundamental patterns work across platforms - only the adapters differ.
