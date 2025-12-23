# AWS API Gateway HTTP Framework

This document describes the AWS API Gateway HTTP v2 framework integration at `src/backend/frameworks/aws-api-gateway-http/`.

## Overview

The framework provides utilities for building AWS Lambda handlers that integrate with API Gateway HTTP APIs (v2). It includes:

- Request/Response mappers
- HTTP exception hierarchy
- Error mapping to HTTP status codes
- Warmup handling (serverless-plugin-warmup)
- Authorizer utilities
- Routing for greedy proxy handlers
- Handler factories

## Installation

```typescript
import { ... } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';
```

Peer dependency required:

```json
{
  "peerDependencies": {
    "@types/aws-lambda": "^8.10.0"
  }
}
```

---

## Architecture

```
aws-api-gateway-http/
├── authorizer/          # Authorizer response builders and decorators
├── constants/           # CORS headers and other constants
├── decorators/          # Method decorators for handlers
├── exceptions/          # HTTP exception hierarchy
├── handlers/            # Lambda handler factories
├── mappers/
│   ├── errors/          # Error → HTTP exception mapping
│   ├── request/         # AWS event → HttpRequest mapping
│   └── response/        # HttpResponse → AWS response mapping
├── middlewares/         # Handler middleware (exception handling)
├── routing/             # Route matching for greedy proxy
├── types/               # TypeScript type definitions
└── warmup/              # Warmup detection utilities
```

---

## Request Mappers

Convert AWS API Gateway v2 events to the standard `HttpRequest` format.

### `mapRequest(event)`

Maps the complete event to an `HttpRequest`:

```typescript
import { mapRequest } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

const httpRequest = mapRequest(event);
// {
//   body: { name: 'John' },
//   headers: { 'content-type': 'application/json' },
//   pathParams: { id: '123' },
//   queryParams: { limit: '10' },
// }
```

### Individual Mappers

For granular control, use individual mappers:

| Function                       | Description                                     |
| ------------------------------ | ----------------------------------------------- |
| `mapRequestBody(event)`        | Parses JSON body, returns raw string on failure |
| `mapRequestHeaders(event)`     | Filters undefined headers                       |
| `mapRequestPathParams(event)`  | Extracts path parameters                        |
| `mapRequestQueryParams(event)` | Extracts query string parameters                |

---

## Response Mappers

Convert `HttpResponse` to AWS API Gateway v2 result format.

### `mapResponse(response, options?)`

```typescript
import { mapResponse } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

const awsResponse = mapResponse({
  statusCode: 200,
  body: { id: 1, name: 'John' },
  headers: { 'X-Custom': 'value' },
});
// {
//   statusCode: 200,
//   body: '{"id":1,"name":"John"}',
//   headers: { 'Content-Type': 'application/json', 'X-Custom': 'value', ...CORS }
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
import { NotFoundException } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

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

## Handler Factories

### `createLambdaHandler(config)`

Creates a single-route Lambda handler:

```typescript
import { createLambdaHandler } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

export const handler = createLambdaHandler({
  controller: myController,
  // Optional: custom input mapping
  mapInput: (event) => ({
    ...mapRequest(event),
    context: event.requestContext.authorizer?.lambda,
  }),
  // Optional: custom output mapping
  mapOutput: (result) => ({
    statusCode: 201,
    body: result,
  }),
  handleWarmup: true, // default: true
  handleExceptions: true, // default: true
});
```

### `createGreedyProxyHandler(config)`

Creates a multi-route handler for greedy proxy paths (`/{proxy+}`):

```typescript
import { createGreedyProxyHandler } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

export const handler = createGreedyProxyHandler({
  serviceName: 'UserService',
  routes: [
    { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
    { metadata: { servicePath: '/users/me', method: 'GET' }, controller: getCurrentUserController },
    { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserController },
  ],
  mapExecutionContext: (event) => event.requestContext.authorizer?.lambda ?? {},
  handleWarmup: true,
  handleExceptions: true,
});
```

Features:

- Automatic route matching with path parameter extraction
- Routes sorted by specificity (`/users/me` matches before `/users/{id}`)
- Warmup handling
- Centralized exception handling

---

## Routing

For advanced routing scenarios, use the routing utilities directly.

### `createRoutingMap(routes)`

```typescript
import { createRoutingMap } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

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

## Warmup Handling

Support for [serverless-plugin-warmup](https://github.com/juanjoDiaz/serverless-plugin-warmup).

### `isWarmupCall(event)`

Detects warmup invocations:

```typescript
import {
  isWarmupCall,
  getWarmupResponse,
} from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

export const handler = async (event) => {
  if (isWarmupCall(event)) {
    return getWarmupResponse();
  }
  // ... handle normal request
};
```

### Warmup Functions

| Function                        | Description                                                          |
| ------------------------------- | -------------------------------------------------------------------- |
| `isWarmupCall(event)`           | Returns `true` if warmup call                                        |
| `getWarmupResponse()`           | Returns `{ statusCode: 200, body: '{"message":"Lambda is warm!"}' }` |
| `getWarmupAuthorizerResponse()` | Returns authorized response for authorizer warmup                    |

---

## Exception Handler Middleware

### `withExceptionHandler(handler)`

Wraps a handler with centralized exception handling:

```typescript
import { withExceptionHandler } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

const rawHandler = async (event) => {
  // May throw errors
  const result = await useCase.execute(input);
  return mapResponse({ statusCode: 200, body: result });
};

export const handler = withExceptionHandler(rawHandler);
```

### `@WithExceptionHandler()` Decorator

For class-based handlers:

```typescript
import { WithExceptionHandler } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

class UserHandler {
  @WithExceptionHandler()
  async handle(event: APIGatewayProxyEventV2) {
    // Exceptions are automatically caught and mapped
    const result = await this.useCase.execute(input);
    return mapResponse({ statusCode: 200, body: result });
  }
}
```

---

## Authorizer Utilities

### Passing Complex Data via Authorizer Context

API Gateway authorizer context only supports primitive types (`string | number | boolean`). To pass complex objects (nested structures, arrays), use the `authorizerPayload` pattern:

1. **Authorizer side**: Use `createAuthorizerPayload()` to serialize complex data
2. **Handler side**: Use `mapAuthorizerPayload()` to deserialize

### `createAuthorizerPayload(data)`

Serializes complex objects to JSON string for use in authorizer context:

```typescript
import {
  generateAuthorizerResponse,
  createAuthorizerPayload,
} from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

return generateAuthorizerResponse({
  isAuthorized: true,
  context: createAuthorizerPayload({
    userId: '123',
    tenantId: 'tenant-abc',
    roles: ['admin', 'user'],
    permissions: { canRead: true, canWrite: true },
  }),
});
```

### `mapAuthorizerPayload<T>(event)`

Deserializes the authorizer payload in handlers:

```typescript
import { mapAuthorizerPayload } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

interface MyAuthContext {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: { canRead: boolean; canWrite: boolean };
}

const authContext = mapAuthorizerPayload<MyAuthContext>(event);
if (authContext) {
  console.log(authContext.userId); // '123'
  console.log(authContext.roles); // ['admin', 'user']
}
```

Returns `null` if the payload is missing, not a string, or invalid JSON.

### `generateAuthorizerResponse(options)`

Builds authorizer responses:

```typescript
import { generateAuthorizerResponse } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

// Authorized
return generateAuthorizerResponse({
  isAuthorized: true,
  context: {
    userId: '123',
    role: 'admin',
  },
});

// Denied
return generateAuthorizerResponse({
  isAuthorized: false,
  context: {},
});
```

### Authorizer Decorators

| Decorator                           | Description                                |
| ----------------------------------- | ------------------------------------------ |
| `@WithWarmupAuthorizer()`           | Short-circuits warmup calls in authorizers |
| `@WithExceptionHandlerAuthorizer()` | Catches errors and returns unauthorized    |

```typescript
import {
  WithWarmupAuthorizer,
  WithExceptionHandlerAuthorizer,
} from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

class AuthHandler {
  @WithWarmupAuthorizer()
  @WithExceptionHandlerAuthorizer()
  async authorize(event: APIGatewayRequestAuthorizerEventV2) {
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

## Constants

### `BASE_HEADERS`

Default CORS headers included in responses:

```typescript
import { BASE_HEADERS } from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

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
// handlers/user.handler.ts
import {
  createGreedyProxyHandler,
  mapRequest,
  mapResponse,
} from '@cosmneo/onion-lasagna/backend/frameworks/aws-api-gateway-http';

// Controllers
const createUserController = {
  async execute(input) {
    const user = await createUserUseCase.execute(input.request.body);
    return { statusCode: 201, body: user };
  },
};

const findUserController = {
  async execute(input) {
    const user = await findUserUseCase.execute(input.request.pathParams.id);
    return { statusCode: 200, body: user };
  },
};

// Handler
export const handler = createGreedyProxyHandler({
  serviceName: 'UserService',
  routes: [
    { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
    { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserController },
  ],
  mapExecutionContext: (event) => event.requestContext.authorizer?.lambda ?? {},
});
```

```yaml
# serverless.yml
functions:
  users:
    handler: handlers/user.handler.handler
    events:
      - httpApi:
          path: /users/{proxy+}
          method: ANY
      - httpApi:
          path: /users
          method: ANY
```
