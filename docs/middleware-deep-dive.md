# Middleware System Deep Dive

This document explains the internal architecture and implementation details of the Cloudflare Workers middleware system.

---

## Table of Contents

1. [Overview](#overview)
2. [The Problem We're Solving](#the-problem-were-solving)
3. [Core Concepts](#core-concepts)
4. [Type System Architecture](#type-system-architecture)
5. [The `defineMiddleware` Factory](#the-definemiddleware-factory)
6. [Context Accumulation](#context-accumulation)
7. [The Middleware Chain Executor](#the-middleware-chain-executor)
8. [Exception Handling Flow](#exception-handling-flow)
9. [Handler Integration](#handler-integration)
10. [TypeScript Challenges & Solutions](#typescript-challenges--solutions)
11. [Execution Flow Diagram](#execution-flow-diagram)
12. [Porting to AWS Lambda](#porting-to-aws-lambda)

---

## Overview

The middleware system allows you to:

1. Define multiple middlewares that run **before** the handler
2. Each middleware can **attach context** to the request
3. Context types are **composed at compile time** (type-safe)
4. Middlewares can **abort** requests by throwing exceptions

This is similar to AWS Lambda Authorizers but more flexible - you can have multiple "authorizers" that build up context incrementally.

---

## The Problem We're Solving

### Without Middlewares

```typescript
export default {
  fetch: createWorkerProxyHandler({
    serviceName: 'UserService',
    routes: [...],
    mapExecutionContext: async (request, env) => {
      // ALL context logic crammed here
      const token = request.headers.get('authorization');
      const user = await validateToken(token);
      const tenant = await getTenant(user.id);
      const permissions = await getPermissions(user.id, tenant.id);

      return {
        userId: user.id,
        roles: user.roles,
        tenantId: tenant.id,
        permissions: permissions,
      };
    },
  }),
};
```

**Problems:**

- Single function doing too much
- No separation of concerns
- Hard to reuse logic across services
- Context type is `unknown` (no type safety)

### With Middlewares

```typescript
export default {
  fetch: createWorkerProxyHandler({
    serviceName: 'UserService',
    routes: [...],
    middlewares: [authMiddleware, tenantMiddleware, permissionsMiddleware] as const,
    // Context type is automatically: AuthContext & TenantContext & PermissionsContext
  }),
};
```

**Benefits:**

- Each middleware is a single responsibility
- Reusable across services
- Type-safe context composition
- Clear execution order

---

## Core Concepts

### What is a Middleware?

A middleware is a function that:

1. Receives the **request**, **environment**, and **accumulated context**
2. Returns a **promise** that resolves to a **context object**
3. Can **throw** to abort the request

```typescript
type Middleware<TOutput, TRequiredContext, TEnv> = (
  request: Request,
  env: TEnv,
  ctx: TRequiredContext,
) => Promise<TOutput>;
```

### Generic Parameters Explained

```typescript
Middleware<TOutput, TRequiredContext, TEnv>;
```

| Parameter          | Description                                      | Example                          |
| ------------------ | ------------------------------------------------ | -------------------------------- |
| `TOutput`          | The context object this middleware produces      | `{ userId: string }`             |
| `TRequiredContext` | Context this middleware needs from previous ones | `{ userId: string }` or `object` |
| `TEnv`             | Cloudflare Worker environment bindings           | `{ DB: D1Database }`             |

### Example Middleware

```typescript
// This middleware:
// - Produces: { userId: string; roles: string[] }
// - Requires: nothing (object = empty context)
// - Uses env: { AUTH_SECRET: string }

const authMiddleware: Middleware<
  { userId: string; roles: string[] }, // TOutput
  object, // TRequiredContext (no dependencies)
  { AUTH_SECRET: string } // TEnv
> = async (request, env, ctx) => {
  const token = request.headers.get('authorization');
  const user = await validateToken(token, env.AUTH_SECRET);
  return { userId: user.id, roles: user.roles };
};
```

---

## Type System Architecture

### File: `middleware/types/middleware.type.ts`

```typescript
import type { WorkerEnv } from '../../types/worker-handler.type';

// The core middleware type
export type Middleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv extends WorkerEnv = WorkerEnv,
> = (request: Request, env: TEnv, ctx: TRequiredContext) => Promise<TOutput>;

// Extracts output type from a middleware
export type MiddlewareOutput<T> =
  T extends Middleware<infer TOutput, object, WorkerEnv> ? TOutput : never;

// Extracts input context type from a middleware
export type MiddlewareInput<T> =
  T extends Middleware<object, infer TInput, WorkerEnv> ? TInput : object;
```

### How `MiddlewareOutput` Works

```typescript
const authMiddleware = defineMiddleware<{ userId: string }>()(async () => ({ userId: '123' }));

type Output = MiddlewareOutput<typeof authMiddleware>;
// Output = { userId: string }
```

The `infer` keyword extracts the type from the generic parameter:

```typescript
// If T is Middleware<{ userId: string }, object, WorkerEnv>
// Then TOutput is inferred as { userId: string }
T extends Middleware<infer TOutput, object, WorkerEnv> ? TOutput : never
```

### File: `middleware/types/middleware-chain.type.ts`

This file contains the most complex type: `AccumulatedContext`.

```typescript
export type AccumulatedContext<
  TMiddlewares extends readonly Middleware<object, object, TEnv>[],
  TEnv extends WorkerEnv = WorkerEnv,
  TAcc extends object = object,
> = TMiddlewares extends readonly [
  infer Head extends Middleware<object, object, TEnv>,
  ...infer Tail extends readonly Middleware<object, object, TEnv>[],
]
  ? AccumulatedContext<Tail, TEnv, TAcc & MiddlewareOutput<Head>>
  : TAcc;
```

This is a **recursive conditional type**. Let me break it down:

---

## Context Accumulation

### How `AccumulatedContext` Works Step by Step

Given this middleware array:

```typescript
const middlewares = [authMiddleware, tenantMiddleware] as const;
// Types:
// authMiddleware: Middleware<{ userId: string }, object, Env>
// tenantMiddleware: Middleware<{ tenantId: string }, { userId: string }, Env>
```

The type computation:

```
Step 1: AccumulatedContext<[authMiddleware, tenantMiddleware], Env, object>

  - TMiddlewares = [authMiddleware, tenantMiddleware]
  - Head = authMiddleware
  - Tail = [tenantMiddleware]
  - TAcc = object

  Result: AccumulatedContext<[tenantMiddleware], Env, object & { userId: string }>

Step 2: AccumulatedContext<[tenantMiddleware], Env, { userId: string }>

  - TMiddlewares = [tenantMiddleware]
  - Head = tenantMiddleware
  - Tail = []
  - TAcc = { userId: string }

  Result: AccumulatedContext<[], Env, { userId: string } & { tenantId: string }>

Step 3: AccumulatedContext<[], Env, { userId: string; tenantId: string }>

  - TMiddlewares = [] (empty array)
  - Doesn't match the pattern, so return TAcc

  Result: { userId: string; tenantId: string }
```

### Visual Representation

```
[authMiddleware, tenantMiddleware]
       ↓
AccumulatedContext recursion:
       ↓
object & { userId: string } & { tenantId: string }
       ↓
Final type: { userId: string; tenantId: string }
```

### Why `as const` is Required

```typescript
// Without `as const`:
const middlewares = [authMiddleware, tenantMiddleware];
// Type: Middleware<object, object, Env>[]
// Lost the specific output types!

// With `as const`:
const middlewares = [authMiddleware, tenantMiddleware] as const;
// Type: readonly [typeof authMiddleware, typeof tenantMiddleware]
// Preserves the tuple structure and specific types!
```

The `as const` assertion:

1. Makes the array `readonly`
2. Preserves it as a **tuple** (fixed length, specific types at each position)
3. Allows TypeScript to extract types from each position

---

## The `defineMiddleware` Factory

### File: `middleware/define-middleware.ts`

```typescript
export function defineMiddleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv extends WorkerEnv = WorkerEnv,
>(): (
  handler: (request: Request, env: TEnv, ctx: TRequiredContext) => Promise<TOutput>,
) => Middleware<TOutput, TRequiredContext, TEnv> {
  return (handler) => {
    return handler as Middleware<TOutput, TRequiredContext, TEnv>;
  };
}
```

### Why the Curried Pattern?

You might wonder why we don't just do:

```typescript
// Why not this?
function defineMiddleware<TOutput, TRequiredContext, TEnv>(
  handler: (request: Request, env: TEnv, ctx: TRequiredContext) => Promise<TOutput>,
): Middleware<TOutput, TRequiredContext, TEnv> {
  return handler;
}
```

**The Problem:** TypeScript cannot infer generic parameters and function parameters simultaneously.

```typescript
// This doesn't work - TypeScript can't infer TOutput from the return statement
const authMiddleware = defineMiddleware(async (request, env) => {
  return { userId: '123' }; // TypeScript doesn't know this is TOutput
});
```

**The Solution:** Currying separates the concerns:

1. First call: You specify the types explicitly
2. Second call: TypeScript infers the function signature

```typescript
// Step 1: Specify types explicitly
const factory = defineMiddleware<{ userId: string }, object, Env>();
// factory has type: (handler: ...) => Middleware<{ userId: string }, object, Env>

// Step 2: Pass the function (TypeScript validates it matches)
const authMiddleware = factory(async (request, env) => {
  return { userId: '123' }; // TypeScript checks this matches { userId: string }
});
```

Combined:

```typescript
const authMiddleware = defineMiddleware<{ userId: string }, object, Env>()(async (request, env) => {
  return { userId: '123' };
});
```

### Generic Parameter Order Rationale

```typescript
defineMiddleware<TOutput, TRequiredContext, TEnv>();
```

1. **TOutput** (first) - Always required, most important
2. **TRequiredContext** (second) - Often `object` for first middleware
3. **TEnv** (third) - Often inferred or defaulted

Common patterns:

```typescript
// First middleware (no dependencies):
defineMiddleware<AuthContext>()(...)  // TRequiredContext defaults to object

// Dependent middleware:
defineMiddleware<TenantContext, AuthContext>()(...)

// With specific env:
defineMiddleware<TenantContext, AuthContext, MyEnv>()(...)
```

---

## The Middleware Chain Executor

### File: `middleware/run-middleware-chain.ts`

```typescript
export async function runMiddlewareChain<
  TMiddlewares extends readonly Middleware<object, object, TEnv>[],
  TEnv extends WorkerEnv = WorkerEnv,
>(
  request: Request,
  env: TEnv,
  middlewares: TMiddlewares,
): Promise<AccumulatedContext<TMiddlewares, TEnv>> {
  let accumulatedContext: object = {};

  for (const middleware of middlewares) {
    const middlewareContext = await middleware(request, env, accumulatedContext);
    accumulatedContext = {
      ...accumulatedContext,
      ...middlewareContext,
    };
  }

  return accumulatedContext as AccumulatedContext<TMiddlewares, TEnv>;
}
```

### Execution Flow

```
Initial state:
  accumulatedContext = {}

After authMiddleware:
  middlewareContext = { userId: '123', roles: ['admin'] }
  accumulatedContext = { userId: '123', roles: ['admin'] }

After tenantMiddleware:
  middlewareContext = { tenantId: 'tenant-abc' }
  accumulatedContext = { userId: '123', roles: ['admin'], tenantId: 'tenant-abc' }

Return:
  accumulatedContext as AccumulatedContext<TMiddlewares, TEnv>
```

### Type Assertion Explanation

```typescript
return accumulatedContext as AccumulatedContext<TMiddlewares, TEnv>;
```

We use `as` because:

1. TypeScript can't track the object shape through the loop
2. At runtime, we know `accumulatedContext` contains all middleware outputs
3. The type assertion tells TypeScript "trust me, this matches the computed type"

This is safe because:

- The loop guarantees we call every middleware
- The spread operator merges all outputs
- The generic type system ensures type consistency

---

## Exception Handling Flow

### File: `middleware/with-exception-handler.middleware.ts`

```typescript
export function withExceptionHandler<TEnv extends WorkerEnv>(
  handler: WorkerHandler<TEnv>,
): WorkerHandler<TEnv> {
  return async (request, env, ctx) => {
    try {
      return await handler(request, env, ctx);
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        if (error instanceof InternalServerErrorException) {
          console.error('[InternalServerError]', error);
        }
        return mapResponse({
          statusCode: error.statusCode,
          body: error.toResponse(),
        });
      }

      const httpException = mapErrorToException(error);
      return mapResponse({
        statusCode: httpException.statusCode,
        body: httpException.toResponse(),
      });
    }
  };
}
```

### How Middleware Exceptions Work

```typescript
const authMiddleware = defineMiddleware<AuthContext>()(async (request, env) => {
  const token = request.headers.get('authorization');

  if (!token) {
    // This exception is thrown...
    throw new UnauthorizedException({
      message: 'Missing token',
      code: 'NO_TOKEN',
    });
  }

  return { userId: '123', roles: [] };
});
```

The exception flow:

```
1. authMiddleware throws UnauthorizedException
   ↓
2. runMiddlewareChain doesn't catch (exception propagates)
   ↓
3. coreHandler doesn't catch (exception propagates)
   ↓
4. withExceptionHandler catches the exception
   ↓
5. Exception is converted to HTTP Response:
   {
     statusCode: 401,
     body: {
       statusCode: 401,
       message: 'Missing token',
       errorCode: 'NO_TOKEN'
     }
   }
   ↓
6. Response returned to client
```

### Exception Types Mapping

```
throw new UnauthorizedException(...) → 401 Unauthorized
throw new ForbiddenException(...)    → 403 Forbidden
throw new NotFoundException(...)     → 404 Not Found
throw new BadRequestException(...)   → 400 Bad Request
throw new ConflictException(...)     → 409 Conflict
throw new Error(...)                 → 500 Internal Server Error (masked)
```

---

## Handler Integration

### File: `handlers/create-worker-proxy-handler.ts`

```typescript
export function createWorkerProxyHandler<
  TController extends ExecutableController = ExecutableController,
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
  TEnv extends WorkerEnv = WorkerEnv,
>(config: CreateWorkerProxyHandlerConfig<TController, TMiddlewares, TEnv>): WorkerHandler<TEnv> {
  const {
    serviceName,
    routes,
    middlewares = [] as unknown as TMiddlewares,
    handleExceptions = true,
    mapExecutionContext,
  } = config;

  const { resolveRoute } = createRoutingMap(routes);

  const coreHandler: WorkerHandler<TEnv> = async (request, env, _ctx) => {
    // ... route resolution ...

    // Build context from middlewares
    let context: AccumulatedContext<TMiddlewares, TEnv>;

    if (middlewares.length > 0) {
      context = await runMiddlewareChain(request, env, middlewares);
    } else if (mapExecutionContext) {
      context = (await mapExecutionContext(request, env)) as AccumulatedContext<TMiddlewares, TEnv>;
    } else {
      context = {} as AccumulatedContext<TMiddlewares, TEnv>;
    }

    // Build controller input
    const controllerInput = {
      metadata: requestMetadata,
      context, // Type: AccumulatedContext<TMiddlewares, TEnv>
      request: await mapWorkerProxyRequest(request, resolved),
    };

    // Execute controller
    const controllerResponse = await resolved.route.controller.execute(controllerInput);
    return mapResponse(controllerResponse);
  };

  // Wrap with exception handler if enabled
  if (handleExceptions) {
    return withExceptionHandler(coreHandler);
  }

  return coreHandler;
}
```

### How the Context Type Flows to Controllers

```typescript
// Middleware definitions
const authMiddleware = defineMiddleware<{ userId: string }>()(...)
const tenantMiddleware = defineMiddleware<{ tenantId: string }, { userId: string }>()(...)

// Handler creation
createWorkerProxyHandler({
  routes: [...],
  middlewares: [authMiddleware, tenantMiddleware] as const,
});

// TypeScript computes:
// TMiddlewares = readonly [typeof authMiddleware, typeof tenantMiddleware]
// AccumulatedContext<TMiddlewares> = { userId: string } & { tenantId: string }

// Controller receives:
input: {
  metadata: RequestMetadata;
  context: { userId: string; tenantId: string };  // Type-safe!
  request: HttpRequest;
}
```

---

## TypeScript Challenges & Solutions

### Challenge 1: Tuple Type Preservation

**Problem:** Arrays lose specific element types.

```typescript
const arr = [authMiddleware, tenantMiddleware];
// Type: Middleware<object, object, Env>[]  ← Lost specific types
```

**Solution:** Use `as const` for tuple assertion.

```typescript
const arr = [authMiddleware, tenantMiddleware] as const;
// Type: readonly [typeof authMiddleware, typeof tenantMiddleware]  ← Preserved!
```

### Challenge 2: Generic Inference with Functions

**Problem:** Can't infer return type and specify input type simultaneously.

```typescript
// This doesn't work
function define<T>(fn: () => T): Middleware<T> { ... }
const m = define(() => ({ userId: '123' }));  // T not inferred correctly
```

**Solution:** Currying separates type specification from function definition.

```typescript
function define<T>(): (fn: () => T) => Middleware<T> {
  return (fn) => fn as Middleware<T>;
}
const m = define<{ userId: string }>()(() => ({ userId: '123' }));
```

### Challenge 3: Recursive Type Computation

**Problem:** Need to compute intersection of N types from N middleware.

**Solution:** Recursive conditional type with tuple decomposition.

```typescript
type AccumulatedContext<T extends readonly Middleware[], TAcc = object> = T extends readonly [
  infer H,
  ...infer R extends readonly Middleware[],
]
  ? AccumulatedContext<R, TAcc & MiddlewareOutput<H>>
  : TAcc;
```

Pattern explanation:

```typescript
T extends readonly [infer H, ...infer R]
//                  ↑         ↑
//                  Head      Rest (tail)

// If T = [A, B, C]:
//   H = A
//   R = [B, C]

// If T = []:
//   Pattern doesn't match, return TAcc
```

### Challenge 4: Runtime Type Safety

**Problem:** TypeScript types are erased at runtime.

**Solution:** The chain executor validates at runtime by:

1. Iterating through all middlewares
2. Calling each with accumulated context
3. Merging results with spread operator

The type system ensures compile-time safety, and the runtime code guarantees the shape matches.

---

## Execution Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INCOMING REQUEST                             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     withExceptionHandler                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                         try {                                  │  │
│  │                                                                │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                  runMiddlewareChain                      │  │  │
│  │  │                                                          │  │  │
│  │  │  ┌────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ authMiddleware(request, env, {})                   │  │  │  │
│  │  │  │ → { userId: '123', roles: ['admin'] }              │  │  │  │
│  │  │  └────────────────────────────────────────────────────┘  │  │  │
│  │  │                         │                                │  │  │
│  │  │                         ▼                                │  │  │
│  │  │  ┌────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ tenantMiddleware(request, env, { userId, roles })  │  │  │  │
│  │  │  │ → { tenantId: 'tenant-abc' }                       │  │  │  │
│  │  │  └────────────────────────────────────────────────────┘  │  │  │
│  │  │                         │                                │  │  │
│  │  │                         ▼                                │  │  │
│  │  │  accumulatedContext = { userId, roles, tenantId }        │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                            │                                   │  │
│  │                            ▼                                   │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                    resolveRoute                          │  │  │
│  │  │  GET /users/123 → findUserController                     │  │  │
│  │  │  pathParams = { id: '123' }                              │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                            │                                   │  │
│  │                            ▼                                   │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              controller.execute(input)                   │  │  │
│  │  │                                                          │  │  │
│  │  │  input = {                                               │  │  │
│  │  │    metadata: { path, method, url },                      │  │  │
│  │  │    context: { userId, roles, tenantId },  ← Type-safe!   │  │  │
│  │  │    request: { body, headers, pathParams, queryParams }   │  │  │
│  │  │  }                                                       │  │  │
│  │  │                                                          │  │  │
│  │  │  → { statusCode: 200, body: user }                       │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                            │                                   │  │
│  │                            ▼                                   │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                     mapResponse                          │  │  │
│  │  │  → Response { status: 200, body: '{"id":"123",...}' }    │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │                         } catch (error) {                      │  │
│  │                                                                │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                   mapErrorToException                    │  │  │
│  │  │  UnauthorizedException → 401 Response                    │  │  │
│  │  │  ForbiddenException → 403 Response                       │  │  │
│  │  │  NotFoundException → 404 Response                        │  │  │
│  │  │  Unknown Error → 500 Response (masked)                   │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                         }                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         OUTGOING RESPONSE                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Porting to AWS Lambda

The middleware system is designed to be portable. Here's how to adapt it for AWS Lambda:

### Changes Required

| Cloudflare Workers              | AWS Lambda                            |
| ------------------------------- | ------------------------------------- |
| `Request`                       | `APIGatewayProxyEventV2`              |
| `env: TEnv`                     | `event.stageVariables` or SSM/Secrets |
| `WorkerContext`                 | `Context` from `aws-lambda`           |
| `new URL(request.url).pathname` | `event.rawPath`                       |
| `request.headers.get('x')`      | `event.headers['x']`                  |

### Adapted Middleware Type

```typescript
// For AWS Lambda
export type LambdaMiddleware<TOutput extends object, TRequiredContext extends object = object> = (
  event: APIGatewayProxyEventV2,
  context: Context,
  ctx: TRequiredContext,
) => Promise<TOutput>;
```

### Why This Makes AWS Authorizers Optional

Currently with AWS:

```
API Gateway → Lambda Authorizer → Lambda Handler
                    ↓
            Cached auth context
```

With middleware:

```
API Gateway → Lambda Handler (with middlewares)
                    ↓
            Auth middleware runs inline (no separate Lambda)
```

**Trade-offs:**

| Aspect      | Lambda Authorizer             | Middleware                        |
| ----------- | ----------------------------- | --------------------------------- |
| Caching     | API Gateway caches results    | No caching (runs every time)      |
| Cold starts | Separate Lambda cold start    | Same Lambda (no extra cold start) |
| Flexibility | Limited to single authorizer  | Multiple composable middlewares   |
| Cost        | Additional Lambda invocations | No extra cost                     |

---

## Summary

The middleware system achieves:

1. **Type Safety**: `AccumulatedContext` computes the intersection at compile time
2. **Composability**: Each middleware is independent and reusable
3. **Simplicity**: Just functions that return context objects
4. **Error Handling**: Throw exceptions to abort, global handler converts to HTTP responses
5. **Portability**: Platform-agnostic design, easily adapted to AWS Lambda

Key files:

| File                                              | Purpose                                 |
| ------------------------------------------------- | --------------------------------------- |
| `middleware/types/middleware.type.ts`             | Core `Middleware` type definition       |
| `middleware/types/middleware-chain.type.ts`       | `AccumulatedContext` recursive type     |
| `middleware/define-middleware.ts`                 | Curried factory for type inference      |
| `middleware/run-middleware-chain.ts`              | Sequential execution with context merge |
| `middleware/with-exception-handler.middleware.ts` | Global error boundary                   |
