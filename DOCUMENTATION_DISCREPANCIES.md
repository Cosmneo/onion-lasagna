# Documentation Discrepancies Report

> **Generated:** 2026-01-01
> **Analyzed by:** 5 parallel documentation discrepancy analyzer agents

## Executive Summary

The documentation is **fundamentally out of sync** with the actual implementation. The library evolved to use a **Unified Route System** (`defineRoute`, `defineRouter`, `serverRoutes` builder), but all documentation still describes an older controller-based architecture with DTOs and metadata.

### Issue Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 30     |
| Major     | 23     |
| Minor     | 17     |
| **Total** | **70** |

---

## Critical Issues by Category

### 1. Non-Existent Classes (Documentation References Code That Doesn't Exist)

| Documented Class     | Documented Location                          | Status                                            |
| -------------------- | -------------------------------------------- | ------------------------------------------------- |
| `BaseController`     | presentation.mdx, new-endpoint.mdx, hono.mdx | **Does not exist** - Use `serverRoutes()` builder |
| `GuardedController`  | presentation.mdx, new-endpoint.mdx           | **Does not exist**                                |
| `BaseDto`            | dtos.mdx                                     | **Does not exist**                                |
| `BaseNestController` | nestjs.mdx                                   | **Does not exist**                                |
| `Dto` wrapper class  | validators.mdx                               | **Does not exist**                                |

### 2. Non-Existent Types

| Documented Type           | Documented Location                | Status                                       |
| ------------------------- | ---------------------------------- | -------------------------------------------- |
| `ServiceMetadata`         | presentation.mdx                   | **Does not exist**                           |
| `ResourceMetadata`        | presentation.mdx                   | **Does not exist**                           |
| `HttpEndpointMetadata`    | presentation.mdx, new-endpoint.mdx | **Does not exist**                           |
| `AccessGuard`             | presentation.mdx, new-endpoint.mdx | **Does not exist**                           |
| `AccessGuardResult`       | presentation.mdx                   | **Does not exist**                           |
| `RouteInput`              | hono.mdx, elysia.mdx, fastify.mdx  | **Does not exist** - Use `UnifiedRouteInput` |
| `ContextualRouteInput<T>` | all framework docs                 | **Does not exist**                           |
| `HttpRouteInput`          | bootstrap.mdx                      | **Does not exist**                           |
| `ObjectValidatorPort`     | validators.mdx                     | **Does not exist**                           |
| `BoundValidator`          | validators.mdx                     | **Does not exist**                           |
| `DtoValidator`            | dtos.mdx, new-endpoint.mdx         | **Does not exist**                           |

### 3. Non-Existent Constants/Functions

| Documented Export        | Documented Location        | Status                                     |
| ------------------------ | -------------------------- | ------------------------------------------ |
| `SKIP_DTO_VALIDATION`    | dtos.mdx, new-endpoint.mdx | **Does not exist**                         |
| `computeRoutePath`       | bootstrap.mdx              | **Does not exist** at documented path      |
| `createZodValidator`     | validators.mdx             | **Does not exist** - Use `zodSchema()`     |
| `createArkTypeValidator` | validators.mdx             | **Not implemented**                        |
| `createValibotValidator` | validators.mdx             | **Not implemented**                        |
| `createTypeBoxValidator` | validators.mdx             | **Does not exist** - Use `typeboxSchema()` |

### 4. Wrong Import Paths (All Framework Docs)

| Documentation Path                                       | Correct Path                                     |
| -------------------------------------------------------- | ------------------------------------------------ |
| `@cosmneo/onion-lasagna/backend/frameworks/hono`         | `@cosmneo/onion-lasagna/http/frameworks/hono`    |
| `@cosmneo/onion-lasagna/backend/frameworks/elysia`       | `@cosmneo/onion-lasagna/http/frameworks/elysia`  |
| `@cosmneo/onion-lasagna/backend/frameworks/fastify`      | `@cosmneo/onion-lasagna/http/frameworks/fastify` |
| `@cosmneo/onion-lasagna/backend/frameworks/nestjs`       | `@cosmneo/onion-lasagna/http/frameworks/nestjs`  |
| `@cosmneo/onion-lasagna/backend/core/validators/zod`     | `@cosmneo/onion-lasagna/http/schema/zod`         |
| `@cosmneo/onion-lasagna/backend/core/validators/typebox` | `@cosmneo/onion-lasagna/http/schema/typebox`     |

### 5. NestJS Naming Discrepancies

| Documentation Name                | Actual Export                 |
| --------------------------------- | ----------------------------- |
| `OnionLasagnaRequest`             | `OnionRequest`                |
| `OnionLasagnaExceptionFilter`     | `OnionExceptionFilter`        |
| `OnionLasagnaResponseInterceptor` | **Does not exist**            |
| `ContextualHttpRequest<T>`        | `ContextualRawHttpRequest<T>` |
| `HttpRequest`                     | `RawHttpRequest`              |

### 6. Elysia Pattern Completely Wrong

**Documentation says:**

```typescript
const app = new Elysia().error(onionErrorHandler).use(registerElysiaRoutes(routes));
```

**Actual implementation:**

```typescript
const app = new Elysia().onError(({ error }) => onionErrorHandler({ error }));

registerElysiaRoutes(app, routes, options); // void function, not plugin
```

### 7. Validators: Only 2 of 4 Implemented

| Validator | Documentation Status | Implementation Status            |
| --------- | -------------------- | -------------------------------- |
| Zod       | Documented           | ✅ Implemented (`zodSchema`)     |
| TypeBox   | Documented           | ✅ Implemented (`typeboxSchema`) |
| ArkType   | Documented           | ❌ Not implemented               |
| Valibot   | Documented           | ❌ Not implemented               |

---

## The Actual Current API (Undocumented)

### Route Definition (New Pattern)

```typescript
import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/http';
import { zodSchema } from '@cosmneo/onion-lasagna/http/schema/zod';
import { z } from 'zod';

// Define individual routes
const createProject = defineRoute({
  method: 'POST',
  path: '/api/projects',
  body: zodSchema(z.object({ name: z.string() })),
  responses: {
    201: { description: 'Created', schema: zodSchema(projectSchema) },
  },
  docs: { summary: 'Create project', tags: ['Projects'] },
});

// Group into router
const projectRouter = defineRouter({
  'projects.create': createProject,
  'projects.list': listProjects,
});
```

### Server Routes (New Pattern)

```typescript
import { serverRoutes, createServerRoutes } from '@cosmneo/onion-lasagna/http/server';

// Builder pattern (preferred)
const routes = serverRoutes(projectRouter)
  .handle('projects.create', {
    requestMapper: (req, ctx) => ({ name: req.body.name, userId: ctx.userId }),
    useCase: createProjectUseCase,
    responseMapper: (output) => ({ status: 201, body: output }),
  })
  .build();

// Or functional pattern
const routes = createServerRoutes(projectRouter, {
  'projects.create': { requestMapper, useCase, responseMapper },
});
```

### Framework Registration (Correct Paths)

```typescript
// Hono
import { registerHonoRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/hono';
app.onError(onionErrorHandler);
registerHonoRoutes(app, routes, { prefix: '/api', contextExtractor });

// Fastify
import { registerFastifyRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/fastify';
app.setErrorHandler(onionErrorHandler);
registerFastifyRoutes(app, routes, { prefix: '/api', contextExtractor });

// Elysia
import { registerElysiaRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/elysia';
app.onError(({ error }) => onionErrorHandler({ error }));
registerElysiaRoutes(app, routes, { contextExtractor });

// NestJS
import { OnionExceptionFilter, OnionRequest } from '@cosmneo/onion-lasagna/http/frameworks/nestjs';
@UseFilters(OnionExceptionFilter)
@Get(':id')
async get(@OnionRequest() request: RawHttpRequest) { ... }
```

---

## Detailed File-by-File Issues

### patterns/dtos.mdx

- ❌ `BaseDto` class does not exist
- ❌ `SKIP_DTO_VALIDATION` does not exist
- ❌ `DtoValidator` type does not exist
- ❌ All code examples will fail

### patterns/validators.mdx

- ❌ `ObjectValidatorPort` interface does not exist
- ❌ `BoundValidator` interface does not exist
- ❌ `createZodValidator` does not exist (use `zodSchema`)
- ❌ `createArkTypeValidator` not implemented
- ❌ `createValibotValidator` not implemented
- ❌ Import paths completely wrong

### patterns/aggregates.mdx

- ⚠️ `nextVersion()` is protected, not public (repository examples fail)
- ⚠️ `OrderStatus.DRAFT` static pattern inconsistent with VO factory pattern

### layers/presentation.mdx

- ❌ `BaseController` does not exist
- ❌ `GuardedController` does not exist
- ❌ `ServiceMetadata` does not exist
- ❌ `ResourceMetadata` does not exist
- ❌ `HttpEndpointMetadata` does not exist
- ❌ `AccessGuard` does not exist
- ❌ All import paths wrong

### layers/infrastructure.mdx

- ✅ `BaseOutboundAdapter` correctly documented

### patterns/error-handling.mdx

- ⚠️ Framework import paths wrong
- ⚠️ NestJS filter name wrong (`OnionLasagnaExceptionFilter` → `OnionExceptionFilter`)
- ⚠️ Elysia method wrong (`.error()` → `.onError()`)

### patterns/bootstrap.mdx

- ❌ `computeRoutePath` does not exist
- ❌ `HttpRouteInput` does not exist
- ❌ `BaseController.create()` pattern does not exist
- ❌ All import paths wrong

### frameworks/hono.mdx

- ❌ Import path wrong
- ❌ `RouteInput` type does not exist
- ❌ `requestDtoFactory` pattern does not exist
- ❌ Controller examples obsolete

### frameworks/elysia.mdx

- ❌ Import path wrong
- ❌ `registerElysiaRoutes` is void, not plugin
- ❌ `.error()` should be `.onError()`
- ❌ Route types do not exist

### frameworks/fastify.mdx

- ❌ Import path wrong
- ❌ Route types do not exist

### frameworks/nestjs.mdx

- ❌ Import path wrong
- ❌ All export names wrong
- ❌ `BaseNestController` does not exist
- ❌ `OnionLasagnaResponseInterceptor` does not exist

### guides/new-endpoint.mdx

- ❌ `BaseController` does not exist
- ❌ `HttpEndpointMetadata` does not exist
- ❌ `AccessGuard` does not exist
- ❌ Entire guide follows obsolete pattern

### guides/new-bounded-context.mdx

- ⚠️ Domain error should extend `DomainError`, not `Error`

---

## Recommendations

### Priority 1: Remove/Rewrite Completely

1. `patterns/dtos.mdx` - API doesn't exist
2. `patterns/validators.mdx` - API completely different
3. `layers/presentation.mdx` - Controller architecture removed
4. `patterns/bootstrap.mdx` - Pattern obsolete
5. `guides/new-endpoint.mdx` - Uses non-existent APIs

### Priority 2: Major Updates Required

1. All framework docs (`frameworks/*.mdx`) - Fix imports, patterns
2. `guides/new-bounded-context.mdx` - Update error patterns

### Priority 3: Minor Updates

1. `patterns/aggregates.mdx` - Fix `nextVersion()` access level
2. `patterns/error-handling.mdx` - Fix import paths, method names

### Priority 4: Add New Documentation

1. Document `defineRoute()` / `defineRouter()` API
2. Document `serverRoutes()` builder pattern
3. Document `createServerRoutes()` function
4. Document schema adapters (`zodSchema`, `typeboxSchema`)
5. Document `createClient()` for type-safe clients
6. Document `generateOpenAPI()` for OpenAPI generation

---

## Reference Implementation

The correct patterns are demonstrated in:

```
/my-todo-app/packages/backend/bounded-contexts/project-management/presentation/http/
```

This shows the actual working implementation with:

- Route contracts using `defineRoute`/`defineRouter`
- Handler configuration using `serverRoutes()` builder
- Framework registration with correct imports
