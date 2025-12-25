# Serverless-Onion Framework: Issues & Proposed Solutions

> **Status**: Analysis document for framework improvement
> **Date**: 2025-12-25
> **Scope**: `/src/backend/frameworks/serverless-onion`

---

## Table of Contents

1. [Issue #1: Dual Error Hierarchy](#issue-1-dual-error-hierarchy)
2. [Issue #2: Code Duplication Between Runtimes](#issue-2-code-duplication-between-runtimes)
3. [Issue #3: Middleware Order Fragility](#issue-3-middleware-order-fragility)
4. [Issue #4: Hardcoded CORS Configuration](#issue-4-hardcoded-cors-configuration)
5. [Issue #5: Greedy Proxy Anti-Pattern](#issue-5-greedy-proxy-anti-pattern)
6. [Issue #6: Over-Abstracted Exception Handling](#issue-6-over-abstracted-exception-handling)
7. [Issue #7: No Test Coverage](#issue-7-no-test-coverage)
8. [Issue #8: Middleware Context Key Collisions](#issue-8-middleware-context-key-collisions)
9. [Summary: Prioritized Roadmap](#summary-prioritized-roadmap)

---

## Issue #1: Dual Error Hierarchy

### Problem

The framework maintains **two parallel error hierarchies** for the same concepts:

**onion-layers errors:**

```typescript
// From @cosmneo/onion-lasagna/backend/core/onion-layers
NotFoundError; // code: NOT_FOUND
ConflictError; // code: CONFLICT
AccessDeniedError; // code: ACCESS_DENIED
InvalidRequestError; // code: INVALID_REQUEST
UnprocessableError; // code: UNPROCESSABLE
```

**serverless-onion exceptions:**

```typescript
// From serverless-onion/core/exceptions
NotFoundException; // status: 404
ConflictException; // status: 409
ForbiddenException; // status: 403
BadRequestException; // status: 400
UnprocessableEntityException; // status: 422
```

This creates:

- **Cognitive overhead**: Developers must learn two sets of error classes
- **Mapping boilerplate**: `mapErrorToException` exists solely to bridge these hierarchies
- **Inconsistent naming**: `AccessDeniedError` vs `ForbiddenException`, `InvalidRequestError` vs `BadRequestException`
- **Redundant code**: ~200 lines of exception classes that duplicate existing concepts

### Proposed Solutions

#### Solution A: Extend Existing Errors with HTTP Metadata (Recommended)

Add HTTP status information to existing onion-layers errors:

```typescript
// In onion-layers/app/exceptions/not-found.error.ts
export class NotFoundError extends UseCaseError {
  static readonly httpStatus = 404;

  constructor(options: { message: string; code?: string; cause?: unknown }) {
    super({ ...options, code: options.code ?? ErrorCodes.App.NOT_FOUND });
  }
}
```

Then in serverless-onion, create a simple status mapper:

```typescript
// serverless-onion/core/utils/error-to-status.util.ts
const ERROR_STATUS_MAP: Record<string, number> = {
  [ErrorCodes.App.NOT_FOUND]: 404,
  [ErrorCodes.App.CONFLICT]: 409,
  [ErrorCodes.App.UNPROCESSABLE]: 422,
  [ErrorCodes.Presentation.ACCESS_DENIED]: 403,
  [ErrorCodes.Presentation.INVALID_REQUEST]: 400,
  [ErrorCodes.Global.OBJECT_VALIDATION_ERROR]: 400,
};

export const getHttpStatus = (error: CodedError): number => {
  return ERROR_STATUS_MAP[error.code] ?? 500;
};
```

**Pros:**

- Single source of truth for errors
- No new classes to learn
- Trivial to extend for custom error codes
- Eliminates ~200 lines of exception code

**Cons:**

- Requires minor changes to onion-layers (adding static httpStatus)
- Breaking change for existing serverless-onion users

#### Solution B: Keep Exceptions, Make Them Thin Wrappers

If backward compatibility is critical, make exceptions thin wrappers:

```typescript
// serverless-onion/core/exceptions/not-found.exception.ts
export class NotFoundException extends NotFoundError {
  static readonly httpStatus = 404;

  constructor(message: string) {
    super({ message });
  }

  toResponse(): HttpExceptionResponse {
    return {
      statusCode: NotFoundException.httpStatus,
      error: 'Not Found',
      message: this.message,
    };
  }
}
```

**Pros:**

- Backward compatible
- Exceptions inherit from correct layer errors
- `instanceof` checks work across both hierarchies

**Cons:**

- Still two naming conventions
- More complex inheritance chain

#### Recommendation

**Go with Solution A.** The dual hierarchy is tech debt that will only grow. A clean break now saves pain later. Document the migration path clearly.

---

## Issue #2: Code Duplication Between Runtimes

### Problem

The AWS and Cloudflare runtimes share ~70% identical logic with copy-paste variations:

| Component         | AWS Version                    | Cloudflare Version             | Shared Logic |
| ----------------- | ------------------------------ | ------------------------------ | ------------ |
| Middleware types  | `middleware.types.ts`          | `middleware.types.ts`          | ~90%         |
| Middleware runner | `run-middleware-chain.util.ts` | `run-middleware-chain.util.ts` | ~95%         |
| Handler factories | `create-lambda-handler.ts`     | `create-worker-handler.ts`     | ~80%         |
| Request mappers   | `map-request.util.ts`          | `map-request.util.ts`          | ~60%         |
| Response mappers  | `map-response.util.ts`         | `map-response.util.ts`         | ~70%         |

**Risks:**

- Bug fixes applied to one runtime but not the other
- Feature drift between platforms
- Increased maintenance burden
- Harder to add new runtimes (Deno Deploy, Vercel Edge, etc.)

### Proposed Solutions

#### Solution A: Extract Platform-Agnostic Core (Recommended)

Create a three-layer architecture:

```
serverless-onion/
├── core/                          # Platform-agnostic
│   ├── middleware/
│   │   ├── types.ts              # Generic middleware types
│   │   ├── run-chain.ts          # Generic chain runner
│   │   └── define.ts             # Factory function
│   ├── handler/
│   │   ├── types.ts              # Generic handler config
│   │   └── create-handler.ts     # Generic handler factory
│   ├── request/
│   │   └── types.ts              # HttpRequest interface
│   ├── response/
│   │   └── types.ts              # HttpResponse interface
│   └── errors/
│       └── mapping.ts            # Error → status code
│
├── adapters/
│   ├── aws-lambda/
│   │   ├── request-adapter.ts    # APIGatewayEvent → HttpRequest
│   │   ├── response-adapter.ts   # HttpResponse → APIGatewayResult
│   │   └── index.ts              # createLambdaHandler (thin wrapper)
│   │
│   └── cloudflare-workers/
│       ├── request-adapter.ts    # Request → HttpRequest
│       ├── response-adapter.ts   # HttpResponse → Response
│       └── index.ts              # createWorkerHandler (thin wrapper)
```

**Generic handler factory:**

```typescript
// core/handler/create-handler.ts
export interface HandlerConfig<TPlatformRequest, TPlatformResponse, TEnv> {
  requestAdapter: (req: TPlatformRequest, env: TEnv) => HttpRequest | Promise<HttpRequest>;
  responseAdapter: (res: HttpResponse) => TPlatformResponse;
  controller: Controller<HttpRequest, HttpResponse>;
  middlewares?: Middleware[];
}

export const createHandler = <TPlatformRequest, TPlatformResponse, TEnv>(
  config: HandlerConfig<TPlatformRequest, TPlatformResponse, TEnv>,
) => {
  return async (platformRequest: TPlatformRequest, env: TEnv): Promise<TPlatformResponse> => {
    const httpRequest = await config.requestAdapter(platformRequest, env);
    const context = await runMiddlewareChain(config.middlewares ?? [], httpRequest, env);
    const httpResponse = await config.controller.execute({ ...httpRequest, context });
    return config.responseAdapter(httpResponse);
  };
};
```

**Platform-specific thin wrapper:**

```typescript
// adapters/aws-lambda/index.ts
import { createHandler } from '../../core/handler/create-handler';
import { awsRequestAdapter } from './request-adapter';
import { awsResponseAdapter } from './response-adapter';

export const createLambdaHandler = <TEnv>(config: LambdaHandlerConfig<TEnv>) => {
  return createHandler({
    requestAdapter: awsRequestAdapter,
    responseAdapter: awsResponseAdapter,
    ...config,
  });
};
```

**Pros:**

- Single source of truth for core logic
- Easy to add new runtimes (just write adapters)
- Platform-specific code is minimal and obvious
- Testable in isolation

**Cons:**

- Significant refactor
- Need to handle async differences (Cloudflare body is async, AWS is sync)

#### Solution B: Shared Utilities with Platform Overrides

Less invasive - extract common utilities:

```typescript
// core/shared/middleware-chain.ts
export const createMiddlewareChainRunner = <TRequest, TEnv>() => {
  return async (middlewares: Middleware[], request: TRequest, env: TEnv) => {
    // Shared implementation
  };
};

// runtimes/aws/middleware.ts
export const runMiddlewareChain = createMiddlewareChainRunner<APIGatewayProxyEventV2, TEnv>();

// runtimes/cloudflare/middleware.ts
export const runMiddlewareChain = createMiddlewareChainRunner<Request, WorkerEnv>();
```

**Pros:**

- Less invasive refactor
- Maintains current structure
- Gradual migration possible

**Cons:**

- Still some duplication
- Doesn't fully solve the architectural issue

#### Recommendation

**Go with Solution A** for a clean architecture. The refactor is significant but the codebase is small enough (~2000 lines) that it's manageable. This also sets up the framework for future runtime support.

---

## Issue #3: Middleware Order Fragility

### Problem

Middleware dependencies are implicit and order-sensitive:

```typescript
const authMiddleware = defineMiddleware<{ userId: string }>()(() => {
  return { userId: 'user-123' };
});

const tenantMiddleware = defineMiddleware<{ tenantId: string }, { userId: string }>()((req, env, ctx) => {
  // ctx.userId is required - but what if authMiddleware isn't first?
  return { tenantId: lookupTenant(ctx.userId) };
});

// This works:
runMiddlewareChain([authMiddleware, tenantMiddleware], ...);

// This compiles but fails at runtime:
runMiddlewareChain([tenantMiddleware, authMiddleware], ...);
```

The type system knows `tenantMiddleware` requires `{ userId: string }` in context, but it doesn't enforce ordering at the call site.

### Proposed Solutions

#### Solution A: Builder Pattern with Type Accumulation (Recommended)

Use a builder that accumulates context types:

```typescript
// core/middleware/chain-builder.ts
class MiddlewareChainBuilder<TContext, TEnv, TRequest> {
  private middlewares: Middleware[] = [];

  add<TOutput>(
    middleware: Middleware<TOutput, TContext, TEnv, TRequest>,
  ): MiddlewareChainBuilder<TContext & TOutput, TEnv, TRequest> {
    this.middlewares.push(middleware);
    return this as unknown as MiddlewareChainBuilder<TContext & TOutput, TEnv, TRequest>;
  }

  build(): Middleware[] {
    return this.middlewares;
  }
}

export const createMiddlewareChain = <TEnv, TRequest>() => {
  return new MiddlewareChainBuilder<{}, TEnv, TRequest>();
};
```

**Usage:**

```typescript
const chain = createMiddlewareChain<Env, Request>()
  .add(authMiddleware) // Now context has { userId: string }
  .add(tenantMiddleware) // Compiles: context has userId
  .build();

// This would NOT compile:
const badChain = createMiddlewareChain<Env, Request>()
  .add(tenantMiddleware) // Error: context {} doesn't have userId
  .add(authMiddleware)
  .build();
```

**Pros:**

- Compile-time enforcement of middleware order
- Clear, fluent API
- Self-documenting dependencies
- IDE autocomplete shows available context

**Cons:**

- Slightly more verbose than array literal
- Requires updating all middleware chain definitions

#### Solution B: Middleware Graph with Explicit Dependencies

Declare dependencies explicitly and let the framework sort:

```typescript
const authMiddleware = defineMiddleware({
  name: 'auth',
  provides: ['userId'],
  requires: [],
  handler: () => ({ userId: 'user-123' }),
});

const tenantMiddleware = defineMiddleware({
  name: 'tenant',
  provides: ['tenantId'],
  requires: ['userId'], // Explicit dependency
  handler: (req, env, ctx) => ({ tenantId: lookupTenant(ctx.userId) }),
});

// Framework sorts automatically
const chain = buildMiddlewareChain([tenantMiddleware, authMiddleware]);
// Result: [authMiddleware, tenantMiddleware] (topologically sorted)
```

**Pros:**

- Order doesn't matter at definition
- Detects circular dependencies
- Self-documenting

**Cons:**

- Loses some type safety (string keys instead of types)
- More complex implementation
- Overkill for simple chains

#### Solution C: Runtime Validation with Helpful Errors

Keep current API but add runtime checks:

```typescript
export const runMiddlewareChain = async <TMiddlewares extends Middleware[]>(
  middlewares: TMiddlewares,
  request: TRequest,
  env: TEnv,
  initialContext: object = {},
) => {
  let context = { ...initialContext };

  for (const middleware of middlewares) {
    // Check if required context keys exist
    const requiredKeys = getRequiredContextKeys(middleware); // via metadata
    const missingKeys = requiredKeys.filter((key) => !(key in context));

    if (missingKeys.length > 0) {
      throw new MiddlewareOrderError(
        `Middleware "${middleware.name}" requires context keys [${missingKeys.join(', ')}] ` +
          `but they were not provided. Check middleware ordering.`,
      );
    }

    const result = await middleware(request, env, context);
    context = { ...context, ...result };
  }

  return context;
};
```

**Pros:**

- No API changes
- Clear error messages
- Easy to implement

**Cons:**

- Runtime error instead of compile-time
- Requires middleware metadata

#### Recommendation

**Go with Solution A (Builder Pattern).** It provides compile-time safety with minimal API change. The fluent interface is actually nicer than the array literal.

---

## Issue #4: Hardcoded CORS Configuration

### Problem

CORS headers are hardcoded in response mappers:

```typescript
// map-response.util.ts
const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

**Issues:**

1. **Wildcard origin breaks credentialed requests** - `credentials: 'include'` requires specific origin
2. **No environment-based configuration** - same CORS for dev/staging/prod
3. **Missing `Access-Control-Allow-Credentials`** - needed for cookies/auth headers
4. **No `Access-Control-Expose-Headers`** - custom response headers invisible to JS
5. **Limited allowed headers** - may need to add custom headers

### Proposed Solutions

#### Solution A: CORS Configuration Object (Recommended)

Add CORS to handler configuration:

```typescript
// core/types/cors.types.ts
export interface CorsConfig {
  origin: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export const defaultCorsConfig: CorsConfig = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};
```

**Handler configuration:**

```typescript
export const handler = createLambdaHandler({
  controller: myController,
  cors: {
    origin: process.env.ALLOWED_ORIGIN ?? 'https://myapp.com',
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  },
});
```

**CORS header builder:**

```typescript
// core/utils/cors.util.ts
export const buildCorsHeaders = (
  config: CorsConfig,
  requestOrigin?: string,
): Record<string, string> => {
  const headers: Record<string, string> = {};

  // Handle origin
  if (typeof config.origin === 'string') {
    headers['Access-Control-Allow-Origin'] = config.origin;
  } else if (Array.isArray(config.origin)) {
    if (requestOrigin && config.origin.includes(requestOrigin)) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    }
  } else if (typeof config.origin === 'function') {
    if (requestOrigin && config.origin(requestOrigin)) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    }
  }

  // Other headers
  if (config.methods) {
    headers['Access-Control-Allow-Methods'] = config.methods.join(', ');
  }
  if (config.allowedHeaders) {
    headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
  }
  if (config.exposedHeaders) {
    headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
  }
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  if (config.maxAge !== undefined) {
    headers['Access-Control-Max-Age'] = String(config.maxAge);
  }

  return headers;
};
```

**Pros:**

- Fully configurable
- Supports dynamic origin checking
- Type-safe configuration
- Sensible defaults

**Cons:**

- More complex configuration
- Breaking change for existing users

#### Solution B: CORS Middleware

Handle CORS as a middleware instead of in response mapper:

```typescript
// middlewares/cors.middleware.ts
export const corsMiddleware = (config: CorsConfig) => {
  return defineMiddleware<{ corsHeaders: Record<string, string> }>()((request, env) => {
    const origin = request.headers?.origin as string | undefined;
    return { corsHeaders: buildCorsHeaders(config, origin) };
  });
};
```

Then merge `corsHeaders` from context into response.

**Pros:**

- Follows existing patterns
- Can be conditionally applied
- Access to full request

**Cons:**

- Requires context → response header plumbing
- More moving parts

#### Solution C: Environment-Based Presets

Provide preset configurations:

```typescript
export const corsPresets = {
  development: {
    origin: '*',
    credentials: false,
  },
  production: (allowedOrigins: string[]) => ({
    origin: allowedOrigins,
    credentials: true,
    maxAge: 86400,
  }),
  disabled: null, // No CORS headers
};
```

**Pros:**

- Simple for common cases
- Environment-aware

**Cons:**

- Less flexible
- Still need underlying config system

#### Recommendation

**Go with Solution A** with preset helpers from Solution C. This gives full control while making common cases easy.

---

## Issue #5: Greedy Proxy Anti-Pattern

### Problem

`createGreedyProxyHandler` implements HTTP routing inside the Lambda/Worker:

```typescript
// AWS: /{proxy+} catches all routes
export const handler = createGreedyProxyHandler({
  controllers: [userController, orderController, ...],
  routingMap: createRoutingMap([...]),
});
```

**Why this is problematic:**

1. **Bypasses platform routing** - API Gateway and Cloudflare both have native routing that's faster and more observable
2. **Cold start penalty** - Single Lambda loads ALL controllers even if only one is needed
3. **No per-route configuration** - Can't set different timeouts, memory, or auth per route
4. **Debugging opacity** - All requests show as `/{proxy+}` in logs/metrics
5. **Reinventing the wheel** - Routing is a solved problem at the platform level

### Proposed Solutions

#### Solution A: Deprecate and Document Platform Routing (Recommended)

1. **Mark `createGreedyProxyHandler` as deprecated**
2. **Document how to use native routing:**

**AWS API Gateway (SAM/CloudFormation):**

```yaml
# template.yaml
Resources:
  GetUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/users.getUser
      Events:
        GetUser:
          Type: Api
          Properties:
            Path: /users/{id}
            Method: get

  CreateUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/users.createUser
      Events:
        CreateUser:
          Type: Api
          Properties:
            Path: /users
            Method: post
```

**Cloudflare Workers (wrangler.toml + router):**

```typescript
// Using Hono or itty-router
import { Hono } from 'hono';
import { createWorkerHandler } from 'serverless-onion';

const app = new Hono();

app.get('/users/:id', createWorkerHandler({ controller: getUserController }));
app.post('/users', createWorkerHandler({ controller: createUserController }));

export default app;
```

**Pros:**

- Leverages platform strengths
- Better observability
- Per-route scaling
- No maintenance burden

**Cons:**

- More infrastructure config
- Breaking change for proxy users

#### Solution B: Keep for Specific Use Cases

If deprecation is too aggressive, document when greedy proxy IS appropriate:

1. **Monolith-first development** - Quick prototyping before splitting
2. **Very small APIs** - <5 routes where overhead doesn't matter
3. **Internal tools** - Where observability isn't critical

Add warnings:

```typescript
/**
 * @deprecated Consider using platform-native routing for production.
 * Greedy proxy has performance and observability drawbacks.
 * See: https://docs.example.com/routing-patterns
 */
export const createGreedyProxyHandler = ...
```

#### Solution C: Hybrid Approach with Route Groups

If proxy is kept, at least support route groups that can be deployed separately:

```typescript
// Define route groups
const userRoutes = defineRouteGroup('/users', [
  { path: '/', method: 'GET', controller: listUsersController },
  { path: '/{id}', method: 'GET', controller: getUserController },
]);

const orderRoutes = defineRouteGroup('/orders', [...]);

// Deploy as separate Lambdas
export const usersHandler = createGroupHandler(userRoutes);
export const ordersHandler = createGroupHandler(orderRoutes);

// OR deploy as monolith for development
export const devHandler = createGreedyProxyHandler({
  groups: [userRoutes, orderRoutes],
});
```

**Pros:**

- Gradual migration path
- Best of both worlds

**Cons:**

- More complexity

#### Recommendation

**Go with Solution A** - deprecate with clear migration docs. The proxy pattern is genuinely an anti-pattern for production serverless.

---

## Issue #6: Over-Abstracted Exception Handling

### Problem

Exception handling has too many layers:

```
Error occurs
  → mapErrorToException()     // Maps to HttpException
    → HttpException.toResponse()  // Creates response body
      → withExceptionHandler()    // Catches and formats
        → mapExceptionToResponse() // Platform-specific formatting
          → Platform response
```

That's **5 transformations** for error → HTTP response.

Compare to what's actually needed:

```
Error occurs
  → getStatusCode(error)      // Error code → HTTP status
    → formatErrorBody(error)  // Error → JSON body
      → Platform response
```

### Proposed Solutions

#### Solution A: Flatten to Single Error Handler (Recommended)

```typescript
// core/errors/handle-error.util.ts
export interface ErrorResponse {
  statusCode: number;
  body: {
    error: string;
    message: string;
    details?: unknown;
  };
}

export const handleError = (error: unknown): ErrorResponse => {
  // Known coded errors
  if (error instanceof CodedError) {
    const statusCode = getHttpStatus(error);
    const isInternal = statusCode >= 500;

    return {
      statusCode,
      body: {
        error: getErrorName(statusCode),
        message: isInternal ? 'An unexpected error occurred' : error.message,
        details:
          !isInternal && error instanceof ObjectValidationError
            ? error.validationErrors
            : undefined,
      },
    };
  }

  // Unknown errors
  console.error('Unhandled error:', error);
  return {
    statusCode: 500,
    body: {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    },
  };
};

const getHttpStatus = (error: CodedError): number => {
  const statusMap: Record<string, number> = {
    [ErrorCodes.App.NOT_FOUND]: 404,
    [ErrorCodes.App.CONFLICT]: 409,
    // ... etc
  };
  return statusMap[error.code] ?? 500;
};

const getErrorName = (status: number): string => {
  const names: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    500: 'Internal Server Error',
  };
  return names[status] ?? 'Error';
};
```

**Handler wrapper becomes trivial:**

```typescript
// adapters/aws-lambda/with-error-handler.ts
export const withErrorHandler = <T extends (...args: any[]) => Promise<APIGatewayProxyResultV2>>(
  handler: T,
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      const { statusCode, body } = handleError(error);
      return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      };
    }
  }) as T;
};
```

**Pros:**

- Single function handles all error logic
- Easy to understand and debug
- ~50 lines instead of ~300
- No HttpException classes needed

**Cons:**

- Less "OOP" (but that's fine)
- Custom error formatting requires modifying handleError

#### Solution B: Keep HttpException but Simplify Chain

If OOP error classes are desired, at least flatten the chain:

```typescript
// Exceptions extend CodedError directly
export class NotFoundException extends NotFoundError {
  readonly statusCode = 404;

  toJSON() {
    return { error: 'Not Found', message: this.message };
  }
}

// Single handler
export const handleError = (error: unknown): HttpResponse => {
  if (error instanceof HttpException) {
    return {
      statusCode: error.statusCode,
      body: error.toJSON(),
    };
  }
  // ... fallback
};
```

**Pros:**

- Keeps OOP pattern
- Simpler than current

**Cons:**

- Still maintaining exception classes

#### Recommendation

**Go with Solution A.** The HttpException hierarchy adds no value over the existing onion-layers errors. A single `handleError` function is cleaner and more maintainable.

---

## Issue #7: No Test Coverage

### Problem

The framework has no visible test files. For infrastructure code that:

- Handles platform-specific edge cases
- Transforms errors for security
- Validates middleware output
- Parses various request formats

This is a significant risk.

### Proposed Solutions

#### Solution A: Comprehensive Test Suite (Required)

**Test categories needed:**

1. **Unit Tests - Error Handling**

```typescript
// __tests__/core/errors/handle-error.test.ts
describe('handleError', () => {
  it('maps NotFoundError to 404', () => {
    const error = new NotFoundError({ message: 'User not found' });
    const result = handleError(error);
    expect(result.statusCode).toBe(404);
    expect(result.body.message).toBe('User not found');
  });

  it('masks internal error messages', () => {
    const error = new DbError({ message: 'Connection failed: password123' });
    const result = handleError(error);
    expect(result.statusCode).toBe(500);
    expect(result.body.message).toBe('An unexpected error occurred');
    expect(result.body.message).not.toContain('password123');
  });

  it('includes validation details for ObjectValidationError', () => {
    const error = new ObjectValidationError({
      message: 'Validation failed',
      validationErrors: [{ field: 'email', message: 'Invalid email' }],
    });
    const result = handleError(error);
    expect(result.statusCode).toBe(400);
    expect(result.body.details).toEqual([{ field: 'email', message: 'Invalid email' }]);
  });
});
```

2. **Unit Tests - Middleware Chain**

```typescript
// __tests__/core/middleware/run-chain.test.ts
describe('runMiddlewareChain', () => {
  it('accumulates context from each middleware', async () => {
    const m1 = defineMiddleware<{ a: number }>()(() => ({ a: 1 }));
    const m2 = defineMiddleware<{ b: number }, { a: number }>()((_, __, ctx) => ({ b: ctx.a + 1 }));

    const result = await runMiddlewareChain([m1, m2], {}, {});
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('throws when middleware returns non-object', async () => {
    const bad = defineMiddleware<string>()(() => 'not an object' as any);
    await expect(runMiddlewareChain([bad], {}, {})).rejects.toThrow();
  });
});
```

3. **Unit Tests - Request/Response Mapping**

```typescript
// __tests__/adapters/aws/request-adapter.test.ts
describe('awsRequestAdapter', () => {
  it('parses JSON body', () => {
    const event = { body: '{"name":"test"}', isBase64Encoded: false };
    const result = mapRequestBody(event);
    expect(result).toEqual({ name: 'test' });
  });

  it('handles base64 encoded body', () => {
    const event = { body: btoa('{"name":"test"}'), isBase64Encoded: true };
    const result = mapRequestBody(event);
    expect(result).toEqual({ name: 'test' });
  });

  it('returns undefined for empty body', () => {
    const event = { body: undefined };
    const result = mapRequestBody(event);
    expect(result).toBeUndefined();
  });
});
```

4. **Integration Tests - Full Handler Flow**

```typescript
// __tests__/integration/aws-handler.test.ts
describe('createLambdaHandler integration', () => {
  it('handles successful request', async () => {
    const controller = { execute: async () => ({ statusCode: 200, body: { ok: true } }) };
    const handler = createLambdaHandler({ controller });

    const event = mockApiGatewayEvent({ path: '/test', method: 'GET' });
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ ok: true });
  });

  it('handles controller error', async () => {
    const controller = {
      execute: async () => {
        throw new NotFoundError({ message: 'Not found' });
      },
    };
    const handler = createLambdaHandler({ controller });

    const event = mockApiGatewayEvent({ path: '/test', method: 'GET' });
    const result = await handler(event, mockContext);

    expect(result.statusCode).toBe(404);
  });
});
```

5. **Platform-Specific Edge Cases**

```typescript
// __tests__/adapters/cloudflare/edge-cases.test.ts
describe('Cloudflare Workers edge cases', () => {
  it('handles streaming body', async () => {
    /* ... */
  });
  it('respects RFC 9110 for 204 responses', async () => {
    /* ... */
  });
  it('clones request body for multiple reads', async () => {
    /* ... */
  });
});
```

**Test tooling:**

- Use `bun:test` (already configured)
- Mock platform types where needed
- Aim for >90% coverage on core logic

#### Recommendation

**This is non-negotiable.** Add tests before any other refactoring. Tests protect against regressions during the other improvements.

---

## Issue #8: Middleware Context Key Collisions

### Problem

Multiple middlewares can accidentally overwrite each other's context:

```typescript
const authMiddleware = defineMiddleware<{ user: User }>()(() => ({ user: currentUser }));
const auditMiddleware = defineMiddleware<{ user: string }>()(() => ({ user: 'audit-system' }));

// Later middleware overwrites earlier
runMiddlewareChain([authMiddleware, auditMiddleware], ...);
// Result: { user: 'audit-system' } - original User object is gone!
```

### Proposed Solutions

#### Solution A: Namespaced Context (Recommended)

Require middlewares to use unique namespaces:

```typescript
const authMiddleware = defineMiddleware<{ auth: { user: User } }>()(() => ({
  auth: { user: currentUser },
}));

const auditMiddleware = defineMiddleware<{ audit: { user: string } }>()(() => ({
  audit: { user: 'audit-system' },
}));

// No collision
// Result: { auth: { user: User }, audit: { user: 'audit-system' } }
```

**Enforce via convention and documentation.**

#### Solution B: Runtime Collision Detection

Warn or error when keys are overwritten:

```typescript
export const runMiddlewareChain = async (...) => {
  let context = { ...initialContext };

  for (const middleware of middlewares) {
    const result = await middleware(request, env, context);

    // Check for collisions
    const collisions = Object.keys(result).filter(key => key in context);
    if (collisions.length > 0) {
      console.warn(
        `Middleware context collision: keys [${collisions.join(', ')}] already exist. ` +
        `Previous values will be overwritten.`
      );
    }

    context = { ...context, ...result };
  }

  return context;
};
```

**Pros:**

- Catches issues in development
- No API changes

**Cons:**

- Runtime only
- Just a warning, doesn't prevent

#### Solution C: Type-Level Collision Prevention

With the builder pattern from Issue #3, we can prevent collisions at compile time:

```typescript
type HasOverlap<A, B> = keyof A & keyof B extends never ? false : true;

class MiddlewareChainBuilder<TContext, TEnv, TRequest> {
  add<TOutput>(
    middleware: HasOverlap<TContext, TOutput> extends true
      ? never // Compile error if keys overlap
      : Middleware<TOutput, TContext, TEnv, TRequest>,
  ): MiddlewareChainBuilder<TContext & TOutput, TEnv, TRequest> {
    // ...
  }
}
```

**Pros:**

- Compile-time prevention
- No runtime overhead

**Cons:**

- Complex type gymnastics
- Error messages may be confusing

#### Recommendation

**Go with Solution A (namespacing) + Solution B (runtime warnings).** Convention plus safety net. Type-level prevention (Solution C) is elegant but the error messages would be confusing.

---

## Summary: Prioritized Roadmap

### Phase 1: Foundation (Do First)

| Priority | Issue                         | Effort | Impact   |
| -------- | ----------------------------- | ------ | -------- |
| P0       | **#7: Add Tests**             | High   | Critical |
| P1       | **#1: Unify Error Hierarchy** | Medium | High     |
| P1       | **#4: Configurable CORS**     | Low    | Medium   |

**Why first:** Tests enable safe refactoring. Error unification simplifies everything else. CORS is a quick win.

### Phase 2: Architecture (Do Second)

| Priority | Issue                                  | Effort | Impact |
| -------- | -------------------------------------- | ------ | ------ |
| P1       | **#2: Extract Platform-Agnostic Core** | High   | High   |
| P2       | **#6: Simplify Exception Handling**    | Medium | Medium |

**Why second:** These are breaking changes that need test coverage first.

### Phase 3: Developer Experience (Do Third)

| Priority | Issue                                | Effort | Impact |
| -------- | ------------------------------------ | ------ | ------ |
| P2       | **#3: Middleware Chain Builder**     | Medium | Medium |
| P2       | **#8: Context Collision Prevention** | Low    | Low    |
| P3       | **#5: Deprecate Greedy Proxy**       | Low    | Medium |

**Why third:** These are improvements, not critical fixes.

---

## Appendix: Migration Guides

### Migrating from HttpException to CodedError

**Before:**

```typescript
throw new NotFoundException('User not found');
```

**After:**

```typescript
throw new NotFoundError({ message: 'User not found' });
```

### Migrating to CORS Configuration

**Before:**

```typescript
// Implicit wildcard CORS
export const handler = createLambdaHandler({ controller });
```

**After:**

```typescript
export const handler = createLambdaHandler({
  controller,
  cors: {
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true,
  },
});
```

### Migrating to Middleware Chain Builder

**Before:**

```typescript
const middlewares = [authMiddleware, tenantMiddleware, loggingMiddleware];
```

**After:**

```typescript
const middlewares = createMiddlewareChain<Env, Request>()
  .add(authMiddleware)
  .add(tenantMiddleware)
  .add(loggingMiddleware)
  .build();
```
