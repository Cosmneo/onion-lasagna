# Cloudflare Workers Framework

This document describes the Cloudflare Workers framework integration at `src/backend/frameworks/cloudflare-workers/`.

## Overview

The framework provides utilities for building Cloudflare Worker fetch handlers. It includes:

- Request/Response mappers
- HTTP exception hierarchy
- Error mapping to HTTP status codes
- Routing for multi-route handlers
- Handler factories
- **Middleware system** for type-safe context injection (like AWS authorizers)

## Installation

```typescript
import { ... } from '@cosmneo/onion-lasagna/backend/frameworks/cloudflare-workers';
```

No peer dependencies required - uses standard Web APIs (Request, Response, URL).

---

## Architecture

```
cloudflare-workers/
├── constants/           # CORS headers and other constants
├── exceptions/          # HTTP exception hierarchy
├── handlers/            # Worker handler factories
├── mappers/
│   ├── errors/          # Error → HTTP exception mapping
│   ├── request/         # Request → HttpRequest mapping
│   └── response/        # HttpResponse → Response mapping
├── middleware/          # Middleware system for context injection
├── routing/             # Route matching for proxy handler
└── types/               # TypeScript type definitions
```

---

## Key Differences from AWS API Gateway

| Aspect        | AWS API Gateway               | Cloudflare Workers              |
| ------------- | ----------------------------- | ------------------------------- |
| Request Type  | `APIGatewayProxyEventV2`      | Web API `Request`               |
| Response Type | `APIGatewayProxyResultV2`     | Web API `Response`              |
| Handler       | `(event, context)`            | `fetch(request, env, ctx)`      |
| Path Access   | `event.rawPath`               | `new URL(request.url).pathname` |
| Query Params  | `event.queryStringParameters` | `url.searchParams`              |
| Headers       | `event.headers` (object)      | `request.headers` (Headers)     |
| Body          | `event.body` (string)         | `await request.json()` (async)  |
| Warmup        | serverless-plugin-warmup      | Not needed                      |

---

## Request Mappers

Convert Cloudflare Workers Request to the standard `HttpRequest` format.

### `mapRequest(request)`

Maps the complete Request to an `HttpRequest`:

```typescript
import { mapRequest } from '@cosmneo/onion-lasagna/backend/frameworks/cloudflare-workers';

const httpRequest = await mapRequest(request);
// {
//   body: { name: 'John' },
//   headers: { 'content-type': 'application/json' },
//   pathParams: undefined, // Extracted by routing
//   queryParams: { limit: '10' },
// }
```

**Note:** Unlike AWS, `mapRequest()` is async because body parsing requires `await request.json()`.

### Individual Mappers

For granular control, use individual mappers:

| Function                         | Description                                       |
| -------------------------------- | ------------------------------------------------- |
| `mapRequestBody(request)`        | Parses JSON body (async), returns text on failure |
| `mapRequestHeaders(request)`     | Converts Headers object to plain object           |
| `mapRequestQueryParams(request)` | Extracts query parameters from URL                |

---

## Response Mappers

Convert `HttpResponse` to Web API Response.

### `mapResponse(response, options?)`

```typescript
import { mapResponse } from '@cosmneo/onion-lasagna/backend/frameworks/cloudflare-workers';

const response = mapResponse({
  statusCode: 200,
  body: { id: 1, name: 'John' },
  headers: { 'X-Custom': 'value' },
});
// Response {
//   status: 200,
//   body: '{"id":1,"name":"John"}',
//   headers: Headers { 'Content-Type': 'application/json', 'X-Custom': 'value', ...CORS }
// }
```

Options:

- `includeBaseHeaders` (default: `true`) - Include CORS headers

### Individual Mappers

| Function                               | Description                                           |
| -------------------------------------- | ----------------------------------------------------- |
| `mapResponseBody(body)`                | Stringifies body to JSON                              |
| `mapResponseHeaders(headers, options)` | Merges base headers, content-type, and custom headers |

---

## HTTP Exceptions

Exception hierarchy extending `ControllerError` with HTTP status codes.

### Available Exceptions

| Exception                      | Status Code | Use Case                          |
| ------------------------------ | ----------- | --------------------------------- |
| `BadRequestException`          | 400         | Invalid input, validation errors  |
| `UnauthorizedException`        | 401         | Missing or invalid authentication |
| `ForbiddenException`           | 403         | Insufficient permissions          |
| `NotFoundException`            | 404         | Resource not found                |
| `ConflictException`            | 409         | Resource conflict (duplicate)     |
| `UnprocessableEntityException` | 422         | Semantic validation errors        |
| `InternalServerErrorException` | 500         | Server errors (masked)            |

### Usage

```typescript
import { NotFoundException } from '@cosmneo/onion-lasagna/backend/frameworks/cloudflare-workers';

throw new NotFoundException({
  message: 'User not found',
  code: 'USER_NOT_FOUND',
});
```

### Exception Response Format

```typescript
interface HttpExceptionResponse {
  statusCode: number;
  message: string;
  errorCode: string;
  errorItems?: Array<{ item: string; message: string }>;
}
```

---

## Error Mapping

The `mapErrorToException` function maps framework errors to HTTP exceptions.

### Mapping Strategy

| Source Error              | HTTP Exception                 | Status       |
| ------------------------- | ------------------------------ | ------------ |
| `ObjectValidationError`   | `BadRequestException`          | 400          |
| `InvalidRequestError`     | `BadRequestException`          | 400          |
| `AccessDeniedError`       | `ForbiddenException`           | 403          |
| `NotFoundError`           | `NotFoundException`            | 404          |
| `ConflictError`           | `ConflictException`            | 409          |
| `UnprocessableError`      | `UnprocessableEntityException` | 422          |
| `UseCaseError` (other)    | `BadRequestException`          | 400          |
| `DomainError`             | `InternalServerErrorException` | 500 (masked) |
| `InfraError`              | `InternalServerErrorException` | 500 (masked) |
| `ControllerError` (other) | `InternalServerErrorException` | 500 (masked) |
| Unknown                   | `InternalServerErrorException` | 500 (masked) |

**Security Note:** Domain and infrastructure errors are masked to avoid leaking internal implementation details.

---

## Middleware System

The middleware system provides type-safe context injection, similar to AWS Lambda authorizers but with more flexibility. Multiple middlewares can be chained, each adding to the accumulated context.

### Defining Middlewares

Use `defineMiddleware` to create type-safe middlewares:

```typescript
import {
  defineMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@cosmneo/onion-lasagna/backend/frameworks/cloudflare-workers';

interface AuthContext {
  userId: string;
  roles: string[];
}

interface TenantContext {
  tenantId: string;
  tenantName: string;
}

interface Env {
  AUTH_SECRET: string;
  DB: D1Database;
}

// Auth middleware - no dependencies (first in chain)
const authMiddleware = defineMiddleware<AuthContext, object, Env>()(async (request, env) => {
  const token = request.headers.get('authorization');
  if (!token) {
    throw new UnauthorizedException({ message: 'Missing token', code: 'NO_TOKEN' });
  }

  const user = await validateToken(token, env.AUTH_SECRET);
  if (!user) {
    throw new UnauthorizedException({ message: 'Invalid token', code: 'INVALID_TOKEN' });
  }

  return { userId: user.id, roles: user.roles };
});

// Tenant middleware - depends on AuthContext
const tenantMiddleware = defineMiddleware<TenantContext, AuthContext, Env>()(async (
  request,
  env,
  ctx,
) => {
  // ctx.userId is typed and available!
  const tenant = await getTenantForUser(ctx.userId, env.DB);
  if (!tenant) {
    throw new ForbiddenException({ message: 'User has no tenant access', code: 'NO_TENANT' });
  }

  return { tenantId: tenant.id, tenantName: tenant.name };
});

// Admin check middleware - validates but adds no context
const adminMiddleware = defineMiddleware<object, AuthContext>()(async (request, env, ctx) => {
  if (!ctx.roles.includes('admin')) {
    throw new ForbiddenException({ message: 'Admin access required', code: 'NOT_ADMIN' });
  }
  return {}; // No additional context
});
```

### Using Middlewares with Handlers

Pass middlewares to `createWorkerProxyHandler`:

```typescript
export default {
  fetch: createWorkerProxyHandler({
    serviceName: 'UserService',
    routes: [
      { metadata: { servicePath: '/users', method: 'GET' }, controller: listUsersController },
      { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: getUserController },
    ],
    middlewares: [authMiddleware, tenantMiddleware] as const,
    // Controller context type: AuthContext & TenantContext
  }),
};
```

The controller receives the accumulated context:

```typescript
const listUsersController = {
  async execute(input: {
    metadata: RequestMetadata;
    context: AuthContext & TenantContext; // Type-safe!
    request: HttpRequest;
  }) {
    console.log(input.context.userId); // string
    console.log(input.context.tenantId); // string
    // ...
  },
};
```

### Middleware Types

| Type                    | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `Middleware<O, R, E>`   | Function type: `(request, env, ctx) => Promise<O>` |
| `MiddlewareOutput<M>`   | Extracts output type from middleware               |
| `AccumulatedContext<M>` | Computes intersection of all middleware outputs    |

### Exception Handling

Middlewares abort requests by throwing exceptions. The global exception handler (`withExceptionHandler`) catches all exceptions and converts them to HTTP responses:

```typescript
// Middleware throws → exception handler catches → HTTP response
throw new UnauthorizedException({ message: 'Invalid token', code: 'INVALID_TOKEN' });
// Results in: 401 { statusCode: 401, message: 'Invalid token', errorCode: 'INVALID_TOKEN' }
```

### Handler Configuration

Both handlers support middleware:

| Option             | Type           | Default | Description                        |
| ------------------ | -------------- | ------- | ---------------------------------- |
| `middlewares`      | `Middleware[]` | `[]`    | Middlewares to run before handler  |
| `handleExceptions` | `boolean`      | `true`  | Wrap with global exception handler |

---

## Handler Factories

### `createWorkerHandler(config)`

Creates a single-route Worker handler:

```typescript
import { createWorkerHandler } from '@cosmneo/onion-lasagna/backend/frameworks/cloudflare-workers';

const handler = createWorkerHandler({
  controller: myController,
  // Optional: custom input mapping
  mapInput: async (request, env) => ({
    ...(await mapRequest(request)),
    apiKey: env.API_KEY,
  }),
  // Optional: custom output mapping
  mapOutput: (result) => ({
    statusCode: 201,
    body: result,
  }),
});

export default { fetch: handler };
```

### `createWorkerProxyHandler(config)`

Creates a multi-route handler for routing multiple endpoints:

```typescript
import { createWorkerProxyHandler } from '@cosmneo/onion-lasagna/backend/frameworks/cloudflare-workers';

interface Env {
  MY_KV: KVNamespace;
  AUTH_SECRET: string;
}

export default {
  fetch: createWorkerProxyHandler<typeof createUserController, AuthContext, Env>({
    serviceName: 'UserService',
    routes: [
      { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
      {
        metadata: { servicePath: '/users/me', method: 'GET' },
        controller: getCurrentUserController,
      },
      { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserController },
    ],
    mapExecutionContext: async (request, env) => {
      const token = request.headers.get('authorization');
      // Validate token, extract user info
      return { userId: '123', roles: ['user'] };
    },
  }),
};
```

Features:

- Automatic route matching with path parameter extraction
- Routes sorted by specificity (`/users/me` matches before `/users/{id}`)
- Access to environment bindings (KV, D1, R2, etc.)

---

## Routing

For advanced routing scenarios, use the routing utilities directly.

### `createRoutingMap(routes)`

```typescript
import { createRoutingMap } from '@cosmneo/onion-lasagna/backend/frameworks/cloudflare-workers';

const { routes, resolveRoute, resolveController } = createRoutingMap([
  { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
  { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserController },
]);

// Resolve a request
const resolved = resolveRoute('/users/123', 'GET');
if (resolved) {
  console.log(resolved.pathParams); // { id: '123' }
  await resolved.route.controller.execute(request);
}
```

### Route Types

```typescript
interface RouteMetadata {
  servicePath: string; // e.g., '/users/{id}'
  method: string; // e.g., 'GET', 'POST'
}

interface RouteInput<TController> {
  metadata: RouteMetadata;
  controller: TController;
}

interface ResolvedRoute<TController> {
  route: RouteDefinition<TController>;
  pathParams: Record<string, string>;
}
```

---

## Types

### `WorkerEnv`

Environment bindings for Cloudflare Workers:

```typescript
type WorkerEnv = Record<string, unknown>;

// Extend for type-safe bindings:
interface MyEnv extends WorkerEnv {
  MY_KV: KVNamespace;
  MY_DB: D1Database;
  API_KEY: string;
}
```

### `WorkerContext`

Execution context for background tasks:

```typescript
interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}
```

### `WorkerHandler`

The fetch handler type:

```typescript
type WorkerHandler<TEnv extends WorkerEnv = WorkerEnv> = (
  request: Request,
  env: TEnv,
  ctx: WorkerContext,
) => Promise<Response>;
```

---

## Constants

### `BASE_HEADERS`

Default CORS headers included in responses:

```typescript
import { BASE_HEADERS } from '@cosmneo/onion-lasagna/backend/frameworks/cloudflare-workers';

// {
//   'Content-Type': 'application/json',
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
//   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//   'Access-Control-Allow-Credentials': 'true',
//   'Access-Control-Max-Age': '86400',
// }
```

---

## Complete Example

```typescript
// worker.ts
import {
  createWorkerProxyHandler,
  defineMiddleware,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@cosmneo/onion-lasagna/backend/frameworks/cloudflare-workers';

// Environment bindings
interface Env {
  USERS_KV: KVNamespace;
  AUTH_SECRET: string;
}

// Context types
interface AuthContext {
  userId: string;
  roles: string[];
}

interface TenantContext {
  tenantId: string;
}

// Middlewares
const authMiddleware = defineMiddleware<AuthContext, object, Env>()(async (request, env) => {
  const token = request.headers.get('authorization');
  if (!token) {
    throw new UnauthorizedException({ message: 'Missing token', code: 'NO_TOKEN' });
  }

  // Validate token with env.AUTH_SECRET...
  const user = await validateToken(token, env.AUTH_SECRET);
  if (!user) {
    throw new UnauthorizedException({ message: 'Invalid token', code: 'INVALID_TOKEN' });
  }

  return { userId: user.id, roles: user.roles };
});

const tenantMiddleware = defineMiddleware<TenantContext, AuthContext, Env>()(async (
  request,
  env,
  ctx,
) => {
  // ctx.userId is typed!
  const tenant = await getTenantForUser(ctx.userId);
  if (!tenant) {
    throw new ForbiddenException({ message: 'No tenant access', code: 'NO_TENANT' });
  }
  return { tenantId: tenant.id };
});

// Controllers
const createUserController = {
  async execute(input: { request: { body: unknown }; context: AuthContext & TenantContext }) {
    const user = { id: '1', tenantId: input.context.tenantId, ...input.request.body };
    return { statusCode: 201, body: user };
  },
};

const findUserController = {
  async execute(input: {
    request: { pathParams: { id: string } };
    context: AuthContext & TenantContext;
  }) {
    const user = await getUserById(input.request.pathParams.id, input.context.tenantId);
    if (!user) {
      throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }
    return { statusCode: 200, body: user };
  },
};

// Handler with middlewares
export default {
  fetch: createWorkerProxyHandler({
    serviceName: 'UserService',
    routes: [
      { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
      { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserController },
    ],
    middlewares: [authMiddleware, tenantMiddleware] as const,
    // handleExceptions: true (default) - catches all errors
  }),
};
```

```toml
# wrangler.toml
name = "user-service"
main = "worker.ts"
compatibility_date = "2024-01-01"

[vars]
AUTH_SECRET = "your-secret"

[[kv_namespaces]]
binding = "USERS_KV"
id = "abc123"
```
