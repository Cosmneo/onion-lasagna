# serverless-onion Runtime Comparison

This document highlights the key differences between the AWS API Gateway HTTP and Cloudflare Workers runtimes in the `serverless-onion` framework.

---

## Overview

Both runtimes share the same **core** module (routing, exceptions, middleware, mappers) but differ in their platform-specific adapters and handler signatures.

| Aspect             | AWS API Gateway HTTP      | Cloudflare Workers      |
| ------------------ | ------------------------- | ----------------------- |
| Entry Point        | Lambda function           | Worker fetch handler    |
| Request Type       | `APIGatewayProxyEventV2`  | `Request` (Web API)     |
| Response Type      | `APIGatewayProxyResultV2` | `Response` (Web API)    |
| Environment        | Lambda context            | Worker bindings (`env`) |
| Middleware Support | Legacy only               | Full type-safe chain    |

---

## Handler Signatures

### AWS Lambda Handler

```typescript
import { createLambdaHandler } from '@cosmneo/onion-lasagna/backend/frameworks/serverless-onion/aws';

export const handler = createLambdaHandler({
  controller: myController,
  mapInput: (event) => mapRequest(event),
  mapOutput: (result) => ({ statusCode: 200, body: result }),
  handleWarmup: true, // AWS-specific: serverless-plugin-warmup
  handleExceptions: true,
});
```

### Cloudflare Worker Handler

```typescript
import { createWorkerHandler } from '@cosmneo/onion-lasagna/backend/frameworks/serverless-onion/cloudflare';

export default {
  fetch: createWorkerHandler({
    controller: myController,
    middlewares: [authMiddleware] as const, // Type-safe middleware chain
    mapInput: async (request, env, ctx, middlewareContext) => ({
      ...(await mapRequest(request)),
      userId: middlewareContext.userId,
    }),
    mapOutput: (result) => ({ statusCode: 200, body: result }),
    handleExceptions: true,
  }),
};
```

---

## Request Mapping

### AWS: Synchronous, Event-Based

```typescript
// AWS API Gateway provides a structured event object
function mapRequest(event: APIGatewayProxyEventV2): HttpRequest {
  return {
    body: mapRequestBody(event), // Parses event.body (string)
    headers: mapRequestHeaders(event), // From event.headers
    pathParams: mapRequestPathParams(event), // From event.pathParameters
    queryParams: mapRequestQueryParams(event), // From event.queryStringParameters
  };
}

// Body parsing is synchronous (already a string in the event)
function mapRequestBody(event: APIGatewayProxyEventV2): unknown {
  if (!event.body) return undefined;

  // Handle base64 encoding
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;

  // Parse JSON if applicable
  const contentType = event.headers?.['content-type'] ?? '';
  if (contentType.includes('application/json')) {
    return JSON.parse(rawBody);
  }
  return rawBody;
}
```

### Cloudflare: Async, Web API Standard

```typescript
// Cloudflare uses standard Web API Request
async function mapRequest(request: Request): Promise<HttpRequest> {
  return {
    body: await mapRequestBody(request), // Async: request.json() or request.text()
    headers: mapRequestHeaders(request), // From request.headers (Headers object)
    pathParams: undefined, // Extracted by routing system
    queryParams: mapRequestQueryParams(request), // From URL.searchParams
  };
}

// Body parsing is async (stream-based)
async function mapRequestBody(request: Request): Promise<unknown> {
  if (!request.body) return undefined;

  const clonedRequest = request.clone(); // Must clone to read multiple times
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return await clonedRequest.json();
  }
  return await clonedRequest.text();
}
```

---

## Response Mapping

### AWS: Returns Plain Object

```typescript
// AWS expects a plain object with specific structure
function mapResponse(response: HttpResponse): APIGatewayProxyResultV2 {
  return {
    statusCode: response.statusCode,
    body: JSON.stringify(response.body), // Must be string
    headers: {
      'Content-Type': 'application/json',
      ...BASE_HEADERS,
      ...response.headers,
    },
  };
}
```

### Cloudflare: Returns Response Object

```typescript
// Cloudflare uses Web API Response constructor
function mapResponse(response: HttpResponse): Response {
  const body = JSON.stringify(response.body);
  const headers = {
    'Content-Type': 'application/json',
    ...BASE_HEADERS,
    ...response.headers,
  };

  return new Response(body, {
    status: response.statusCode,
    headers,
  });
}
```

---

## Middleware Pattern

### AWS: No Native Middleware (Legacy Context Mapper)

AWS Lambda doesn't have a built-in middleware pattern. The framework provides a simple context mapper:

```typescript
createGreedyProxyHandler({
  serviceName: 'UserService',
  routes: [...],
  // Legacy approach: single function to extract context
  mapExecutionContext: (event) => ({
    userId: event.requestContext.authorizer?.lambda?.userId,
    tenantId: event.requestContext.authorizer?.lambda?.tenantId,
  }),
});
```

### Cloudflare: Type-Safe Middleware Chain

Cloudflare Workers support a full middleware chain with accumulated context:

```typescript
// Define type-safe middlewares
const authMiddleware = defineMiddleware<AuthContext, object, Env>()(
  async (request, env) => {
    const token = request.headers.get('authorization');
    if (!token) throw new UnauthorizedException({ message: 'No token', code: 'NO_TOKEN' });
    const user = await validateToken(token, env.AUTH_SECRET);
    return { userId: user.id, roles: user.roles };  // Returns AuthContext
  }
);

const tenantMiddleware = defineMiddleware<TenantContext, AuthContext, Env>()(
  async (request, env, prevContext) => {
    // Has access to AuthContext from previous middleware
    const tenant = await getTenant(prevContext.userId, env);
    return { tenantId: tenant.id };  // Returns TenantContext
  }
);

// Use in handler - context is fully typed
createWorkerProxyHandler({
  serviceName: 'UserService',
  routes: [...],
  middlewares: [authMiddleware, tenantMiddleware] as const,
  // Controller receives: AuthContext & TenantContext
});
```

---

## AWS-Specific Features

### Warmup Handling

AWS Lambda supports warmup plugins to keep functions warm:

```typescript
import {
  isWarmupCall,
  getWarmupResponse,
} from '@cosmneo/onion-lasagna/backend/frameworks/serverless-onion/aws';

// Automatically handled when handleWarmup: true
if (isWarmupCall(event)) {
  console.info('Lambda is warm!');
  return getWarmupResponse();
}
```

### Lambda Authorizer Utilities

```typescript
import {
  generateAuthorizerResponse,
  createAuthorizerPayload,
  mapAuthorizerPayload,
} from '@cosmneo/onion-lasagna/backend/frameworks/serverless-onion/aws';

// In authorizer Lambda
return generateAuthorizerResponse({
  isAuthorized: true,
  context: createAuthorizerPayload({
    userId: '123',
    roles: ['admin'],
    permissions: { canRead: true },
  }),
});

// In downstream Lambda
const authContext = mapAuthorizerPayload<MyAuthContext>(event);
```

### Decorators for Class-Based Handlers

```typescript
import {
  WithExceptionHandler,
  WithWarmupAuthorizer,
  WithExceptionHandlerAuthorizer,
} from '@cosmneo/onion-lasagna/backend/frameworks/serverless-onion/aws';

class AuthorizationHandler {
  @WithWarmupAuthorizer()
  @WithExceptionHandlerAuthorizer()
  async authorize(event: APIGatewayRequestAuthorizerEventV2) {
    // Warmup calls are short-circuited
    // Exceptions return 401 Unauthorized
    const token = event.headers?.authorization;
    const user = await validateToken(token);
    return generateAuthorizerResponse({
      isAuthorized: !!user,
      context: { userId: user.id },
    });
  }
}
```

---

## Cloudflare-Specific Features

### Environment Bindings

Cloudflare Workers have typed environment bindings:

```typescript
interface Env extends WorkerEnv {
  MY_KV: KVNamespace;
  MY_DB: D1Database;
  AUTH_SECRET: string;
}

// Available in handlers and middlewares
const handler = createWorkerHandler<Input, Output, [], Env>({
  controller: myController,
  mapInput: async (request, env) => ({
    ...(await mapRequest(request)),
    secret: env.AUTH_SECRET, // Type-safe access
  }),
});
```

### Execution Context

```typescript
interface WorkerContext {
  // Extends worker lifetime for background tasks
  waitUntil(promise: Promise<unknown>): void;

  // Falls back to origin on error
  passThroughOnException(): void;
}

// Usage in handler
const handler: WorkerHandler<Env> = async (request, env, ctx) => {
  const result = await processRequest(request);

  // Log analytics after response is sent
  ctx.waitUntil(analytics.track(result));

  return mapResponse({ statusCode: 200, body: result });
};
```

---

## Request Metadata

### AWS: Rich Metadata from API Gateway

```typescript
interface RequestMetadata {
  path: string; // event.rawPath
  method: string; // event.requestContext.http.method
  requestId: string; // event.requestContext.requestId
  sourceIp: string; // event.requestContext.http.sourceIp
  userAgent: string; // event.requestContext.http.userAgent
}
```

### Cloudflare: Standard Web API

```typescript
interface RequestMetadata {
  path: string; // new URL(request.url).pathname
  method: string; // request.method
  url: string; // request.url (full URL)
}

// Additional info available via request object
const headers = request.headers;
const cf = request.cf; // Cloudflare-specific data (country, colo, etc.)
```

---

## Summary Table

| Feature              | AWS API Gateway HTTP           | Cloudflare Workers     |
| -------------------- | ------------------------------ | ---------------------- |
| Request body parsing | Sync (string in event)         | Async (stream-based)   |
| Path params          | From `event.pathParameters`    | Extracted by router    |
| Headers              | Plain object                   | `Headers` object       |
| Query params         | Plain object                   | `URLSearchParams`      |
| Response format      | Plain object                   | `Response` constructor |
| Middleware           | Legacy context mapper          | Type-safe chain        |
| Warmup handling      | Yes (serverless-plugin-warmup) | N/A                    |
| Authorizer utilities | Yes                            | N/A                    |
| Decorators           | Yes                            | N/A                    |
| Environment          | Lambda context                 | Worker bindings        |
| Background tasks     | N/A                            | `ctx.waitUntil()`      |

---

## Migration Guide

### From AWS to Cloudflare

1. Replace `APIGatewayProxyEventV2` with `Request`
2. Make body parsing async
3. Convert context mapper to middleware chain
4. Update response to use `Response` constructor
5. Remove warmup handling (not needed in Workers)

### From Cloudflare to AWS

1. Replace `Request` with `APIGatewayProxyEventV2`
2. Make body parsing sync
3. Convert middleware chain to authorizer + context mapper
4. Update response to plain object format
5. Add warmup handling if using serverless-plugin-warmup
