# serverless-onion Framework: Code Quality Analysis

**Date:** 2024-12-24
**Scope:** `src/backend/frameworks/serverless-onion/`

---

## Executive Summary

The serverless-onion framework provides a unified abstraction layer for building serverless HTTP handlers across AWS Lambda and Cloudflare Workers. While the core architecture is sound, there are several code quality issues ranging from inconsistencies between runtimes to potential runtime errors.

**Overall Assessment:** Good foundation with room for improvement in consistency and code deduplication.

---

## Architecture Overview

```
serverless-onion/
├── core/                          # Shared, platform-agnostic code
│   ├── constants/                 # BASE_HEADERS
│   ├── exceptions/                # HttpException hierarchy
│   ├── mappers/errors/            # Error → HttpException mapping
│   ├── middleware/                # Generic middleware types & runner
│   ├── types/                     # HttpExceptionResponse
│   └── wrappers/                  # createExceptionHandler factory
│
└── runtimes/
    ├── aws-api-gateway-http/      # AWS Lambda + API Gateway v2
    │   ├── adapters/              # Request/Response mappers
    │   ├── features/              # Warmup, Authorizer utilities
    │   ├── handlers/              # createLambdaHandler, createGreedyProxyHandler
    │   ├── middleware/            # AWS-typed middleware (APIGatewayProxyEventV2)
    │   ├── types/                 # LambdaHandler type
    │   └── wrappers/              # withExceptionHandler
    │
    └── cloudflare-workers/        # Cloudflare Workers
        ├── adapters/              # Request/Response mappers
        ├── handlers/              # createWorkerHandler, createWorkerProxyHandler
        ├── middleware/            # Cloudflare-typed middleware (Request)
        ├── types/                 # WorkerHandler, WorkerEnv, WorkerContext
        └── wrappers/              # withExceptionHandler
```

---

## Issues by Priority

### 🔴 HIGH PRIORITY

#### 1. ~~Inconsistent Middleware Pattern Between Runtimes~~ ✅ FIXED

**Problem:**
AWS has a dedicated `middleware/` folder that provides AWS-typed middleware wrappers, while Cloudflare uses core middleware types directly.

**Solution:**
Added `middleware/` folder to Cloudflare runtime matching AWS pattern:

```
cloudflare-workers/
└── middleware/
    ├── define-middleware.ts       # Cloudflare-specific defineMiddleware (Request type)
    ├── index.ts
    └── types/
        ├── middleware.type.ts     # Middleware<TOutput, TCtx, TEnv> using Request
        ├── middleware-chain.type.ts
        └── index.ts
```

Both runtimes now follow the same pattern:

- Core provides generic `Middleware<..., TRequest>`
- AWS specializes with `APIGatewayProxyEventV2`
- Cloudflare specializes with `Request`

**Usage (now consistent):**

```typescript
// AWS - uses runtime-specific middleware
import { defineMiddleware, Middleware } from '@cosmneo/onion-lasagna/serverless-onion/aws';

const authMiddleware = defineMiddleware<AuthContext>()(async (event, env, ctx) => {
  // event is typed as APIGatewayProxyEventV2
  const token = event.headers?.authorization;
  return { userId: '123' };
});

// Cloudflare - now uses runtime-specific middleware
import { defineMiddleware, Middleware } from '@cosmneo/onion-lasagna/serverless-onion/cloudflare';

const authMiddleware = defineMiddleware<AuthContext>()(async (request, env, ctx) => {
  // request is typed as Request (Web API)
  const token = request.headers.get('authorization');
  return { userId: '123' };
});
```

---

#### 2. `undefined as TEnv` Type Hack

**Problem:**
AWS handlers pass `undefined` as the environment parameter when running middleware chains.

**Location:**

- `runtimes/aws-api-gateway-http/handlers/create-greedy-proxy-handler.ts:248`
- `runtimes/aws-api-gateway-http/handlers/create-lambda-handler.ts:158`

**Current Code:**

```typescript
context = await runMiddlewareChain(
  event,
  undefined as TEnv, // AWS doesn't have explicit env bindings like Cloudflare
  middlewares,
  authorizerContext,
);
```

**Impact:**

- If a middleware accesses `env`, it will be `undefined` at runtime
- Type system lies about `env` being `TEnv` when it's actually `undefined`
- Could cause runtime crashes

**Recommendation:**
Option A: Make `env` optional in middleware type and explicitly handle it:

```typescript
type Middleware<TOutput, TRequiredContext, TEnv = undefined, TRequest = Request> = (
  request: TRequest,
  env: TEnv,
  ctx: TRequiredContext,
) => Promise<TOutput>;
```

Option B: For AWS, pass an empty object or Lambda context instead:

```typescript
const env = {} as TEnv; // Or pass Lambda Context
context = await runMiddlewareChain(event, env, middlewares, authorizerContext);
```

Option C: Update AWS middleware signature to not include `env` (breaking change).

---

### 🟡 MEDIUM PRIORITY

#### 3. Inconsistent Export Patterns

**Problem:**
AWS index uses explicit named exports while Cloudflare uses wildcard exports.

**AWS (`runtimes/aws-api-gateway-http/index.ts`):**

```typescript
// Explicit - clear but verbose
export {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  // ... many more
} from '../../core';
```

**Cloudflare (`runtimes/cloudflare-workers/index.ts`):**

```typescript
// Wildcard - simple but less explicit
export * from '../../core';
```

**Impact:**

- Inconsistent developer experience
- AWS consumers have clearer IDE autocomplete
- Cloudflare may export things unintentionally

**Recommendation:**
Standardize on explicit exports for both runtimes. This provides:

- Clear API surface
- Better tree-shaking
- Protection against accidental breaking changes

---

#### 4. Redundant Exception Handler Implementations

**Problem:**
Core provides `createExceptionHandler<TResponse>()` factory, but both runtimes implement their own `withExceptionHandler` functions with duplicated logic.

**Files:**

- `core/wrappers/with-exception-handler.ts` - Generic factory (unused by runtimes)
- `aws-api-gateway-http/wrappers/with-exception-handler.ts` - AWS-specific
- `cloudflare-workers/wrappers/with-exception-handler.ts` - Cloudflare-specific

**Core Factory (not used by runtimes):**

```typescript
export function createExceptionHandler<TResponse>(
  config: ExceptionHandlerConfig<TResponse>,
): <THandler extends (...args: never[]) => Promise<TResponse>>(handler: THandler) => THandler;
```

**Duplicated Logic in Both Runtimes:**

```typescript
// Both do this:
try {
  return await handler(...);
} catch (error: unknown) {
  if (error instanceof HttpException) {
    if (error instanceof InternalServerErrorException) {
      console.error('[InternalServerError]', error);
    }
    return mapResponse({ statusCode: error.statusCode, body: error.toResponse() });
  }
  const httpException = mapErrorToException(error);
  return mapResponse({ statusCode: httpException.statusCode, body: httpException.toResponse() });
}
```

**Recommendation:**
Refactor runtime `withExceptionHandler` to use the core `createExceptionHandler`:

```typescript
// aws-api-gateway-http/wrappers/with-exception-handler.ts
import { createExceptionHandler } from '../../../core';
import { mapResponse } from '../adapters/response';

export const withExceptionHandler = createExceptionHandler<APIGatewayProxyResultV2>({
  mapExceptionToResponse: (exception) =>
    mapResponse({
      statusCode: exception.statusCode,
      body: exception.toResponse(),
    }),
});
```

---

#### 5. Duplicated Controller Interfaces

**Problem:**
Both runtimes define identical controller interfaces.

**AWS (`handlers/create-lambda-handler.ts`):**

```typescript
export interface LambdaController<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
```

**Cloudflare (`handlers/create-worker-handler.ts`):**

```typescript
export interface WorkerController<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
```

**Already Exists in Core:**

```typescript
// core/bounded-context/presentation/routing/types.ts
export interface ExecutableController {
  execute(input: unknown): Promise<unknown>;
}
```

**Impact:**

- Unnecessary duplication
- Potential for interfaces to drift
- Confusing which to use

**Recommendation:**
Remove `LambdaController` and `WorkerController`. Use `ExecutableController` from routing, or create a more generic version in core:

```typescript
// core/types/controller.type.ts
export interface Controller<TInput = unknown, TOutput = unknown> {
  execute(input: TInput): Promise<TOutput>;
}
```

---

#### 6. `RequestMetadata` Defined Twice with Different Fields

**Problem:**
Both runtimes define `RequestMetadata` with different fields.

**AWS (`handlers/create-greedy-proxy-handler.ts`):**

```typescript
export interface RequestMetadata {
  path: string;
  method: string;
  requestId: string; // AWS-specific
  sourceIp: string; // AWS-specific
  userAgent: string; // AWS-specific
}
```

**Cloudflare (`handlers/create-worker-proxy-handler.ts`):**

```typescript
export interface RequestMetadata {
  path: string;
  method: string;
  url: string; // Cloudflare-specific
}
```

**Impact:**

- Controllers receive different metadata shapes depending on runtime
- Can't write runtime-agnostic controller code
- No shared base type

**Recommendation:**
Create a base interface in core with optional platform-specific extensions:

```typescript
// core/types/request-metadata.type.ts
export interface BaseRequestMetadata {
  path: string;
  method: string;
}

// aws-api-gateway-http/types/request-metadata.type.ts
export interface AwsRequestMetadata extends BaseRequestMetadata {
  requestId: string;
  sourceIp: string;
  userAgent: string;
}

// cloudflare-workers/types/request-metadata.type.ts
export interface CloudflareRequestMetadata extends BaseRequestMetadata {
  url: string;
}
```

---

### 🟢 LOW PRIORITY

#### 7. No Test Coverage

**Problem:**
No test files found in the serverless-onion framework.

**Impact:**

- No regression protection
- Difficult to refactor safely
- No documentation via tests

**Recommendation:**
Add tests for:

- Core middleware chain execution
- Error mapping
- Handler factories
- Request/Response adapters

**Suggested Test Structure:**

```
serverless-onion/
├── core/
│   └── __tests__/
│       ├── middleware/
│       │   └── run-middleware-chain.test.ts
│       └── mappers/
│           └── map-error-to-exception.test.ts
└── runtimes/
    ├── aws-api-gateway-http/
    │   └── __tests__/
    │       └── handlers/
    │           ├── create-lambda-handler.test.ts
    │           └── create-greedy-proxy-handler.test.ts
    └── cloudflare-workers/
        └── __tests__/
            └── handlers/
                ├── create-worker-handler.test.ts
                └── create-worker-proxy-handler.test.ts
```

---

#### 8. ~~Cloudflare Doesn't Export `defineMiddleware` from Local Module~~ ✅ FIXED

**Problem:**
Cloudflare re-exports `defineMiddleware` from core, which uses `Request` as default. This works correctly but the pattern differs from AWS.

**Solution:**
Added Cloudflare-specific `defineMiddleware` in `cloudflare-workers/middleware/define-middleware.ts`:

```typescript
export function defineMiddleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv extends WorkerEnv = WorkerEnv,
>(): (
  handler: (request: Request, env: TEnv, ctx: TRequiredContext) => Promise<TOutput>,
) => Middleware<TOutput, TRequiredContext, TEnv> {
  return (handler) => handler as Middleware<TOutput, TRequiredContext, TEnv>;
}
```

Cloudflare now exports `defineMiddleware` from its local `middleware/` folder, matching AWS pattern.

---

## Summary Table

| #   | Issue                            | Priority  | Effort | Files Affected | Status   |
| --- | -------------------------------- | --------- | ------ | -------------- | -------- |
| 1   | Inconsistent middleware pattern  | 🔴 High   | Medium | 5+ files       | ✅ Fixed |
| 2   | `undefined as TEnv` hack         | 🔴 High   | Low    | 2 files        | ✅ Fixed |
| 3   | Inconsistent export patterns     | 🟡 Medium | Low    | 2 files        | ✅ Fixed |
| 4   | Redundant exception handlers     | 🟡 Medium | Low    | 2 files        | ✅ Fixed |
| 5   | Duplicated controller interfaces | 🟡 Medium | Low    | 2 files        | ✅ Fixed |
| 6   | RequestMetadata duplication      | 🟡 Medium | Low    | 3+ files       | ✅ Fixed |
| 7   | No test coverage                 | 🟢 Low    | High   | New files      | Open     |
| 8   | Cloudflare defineMiddleware      | 🟢 Low    | Low    | 1-2 files      | ✅ Fixed |

---

## Recommended Action Plan

### Phase 1: Quick Wins (Low Effort, High Impact)

1. ~~Fix `undefined as TEnv` hack~~ ✅ **DONE** - Added `env` config option, changed `TEnv` default to `undefined`
2. ~~Unify exception handler implementations using core factory~~ ✅ **DONE** - Both runtimes now use `createExceptionHandler`
3. ~~Remove duplicate controller interfaces~~ ✅ **DONE** - Removed `ExecutableController`, `LambdaController`, `WorkerController`. Used inline constraints.

### Phase 2: Consistency (Medium Effort)

4. ~~Decide on middleware pattern (add to Cloudflare or remove from AWS)~~ ✅ **DONE** - Added `middleware/` folder to Cloudflare matching AWS pattern
5. ~~Standardize export patterns~~ ✅ **DONE** - Removed all re-exports from runtimes
6. ~~Create base RequestMetadata type~~ ✅ **DONE** - Created `BaseRequestMetadata` in `core/presentation/types/http/`

### Phase 3: Quality (High Effort)

7. Add comprehensive test coverage

---

## Appendix: File Inventory

### Core (7 files)

- `core/index.ts`
- `core/constants/headers.ts`
- `core/exceptions/*.ts` (8 files)
- `core/mappers/errors/map-error-to-exception.ts`
- `core/middleware/define-middleware.ts`
- `core/middleware/run-middleware-chain.ts`
- `core/middleware/types/middleware.type.ts`
- `core/middleware/types/middleware-chain.type.ts`
- `core/types/http-exception-response.type.ts`
- `core/wrappers/with-exception-handler.ts`

### AWS Runtime (20+ files)

- `aws-api-gateway-http/index.ts`
- `aws-api-gateway-http/handlers/create-lambda-handler.ts`
- `aws-api-gateway-http/handlers/create-greedy-proxy-handler.ts`
- `aws-api-gateway-http/middleware/define-middleware.ts`
- `aws-api-gateway-http/middleware/types/middleware.type.ts`
- `aws-api-gateway-http/middleware/types/middleware-chain.type.ts`
- `aws-api-gateway-http/adapters/request/*.ts`
- `aws-api-gateway-http/adapters/response/*.ts`
- `aws-api-gateway-http/features/warmup/*.ts`
- `aws-api-gateway-http/features/authorizer/*.ts`
- `aws-api-gateway-http/wrappers/with-exception-handler.ts`
- `aws-api-gateway-http/types/lambda-handler.type.ts`

### Cloudflare Runtime (18+ files)

- `cloudflare-workers/index.ts`
- `cloudflare-workers/handlers/create-worker-handler.ts`
- `cloudflare-workers/handlers/create-worker-proxy-handler.ts`
- `cloudflare-workers/middleware/define-middleware.ts`
- `cloudflare-workers/middleware/types/middleware.type.ts`
- `cloudflare-workers/middleware/types/middleware-chain.type.ts`
- `cloudflare-workers/adapters/request/*.ts`
- `cloudflare-workers/adapters/response/*.ts`
- `cloudflare-workers/wrappers/with-exception-handler.ts`
- `cloudflare-workers/types/worker-handler.type.ts`
