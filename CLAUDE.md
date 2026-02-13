# CLAUDE.md

> **IMPORTANT:** When working with this library, ALWAYS search the codebase for actual implementations. DO NOT imagine or assume file contents, exports, or patterns. Use `Glob`, `Grep`, or `Read` tools to verify before making changes.

## Monorepo Structure

```
onion-lasagna/
├── packages/onion-lasagna/    # Library (@cosmneo/onion-lasagna)
├── apps/docs/                 # Next.js docs site
├── examples/my-todo-app/      # Reference implementation
└── starters/                  # Project templates
```

## Commands

```bash
bun install        # Install deps
bun run build      # Build all
bun run dev        # Dev mode
bun run test       # Tests (watch)
bun run test:run   # Tests (once)
bun run lint:fix   # Fix lint
bun run format     # Prettier
```

**Runtime:** Always use `bun`, never `node/npm/pnpm`.

---

## Architecture Quick Reference

| Layer        | Path                         | Purpose                               |
| ------------ | ---------------------------- | ------------------------------------- |
| Domain       | `onion-layers/domain/`       | Entities, VOs, Events, business rules |
| App          | `onion-layers/app/`          | Use cases, ports, adapters            |
| Infra        | `onion-layers/infra/`        | Repositories, external services       |
| Presentation | `onion-layers/presentation/` | Controllers, HTTP mapping             |
| Global       | `global/`                    | DTOs, errors, validators              |
| Frameworks   | `frameworks/`                | Hono, Elysia, Fastify, NestJS         |

> **Search:** For actual exports and classes, grep `packages/onion-lasagna/src/backend/core/**/index.ts`

---

## Data Flow

```
HTTP Request → Framework Adapter → RawHttpRequest
    → Schema validation (if defined) → ValidatedRequest
    → Route Handler:
        → requestMapper(req, ctx) → UseCaseInput
        → useCase.execute()
            → BaseInboundAdapter.handle()
            → Domain ops + Repository calls
            → UseCaseOutput
        → responseMapper(output) → { status, body, headers }
    → Framework sends response
```

## Error Flow

```
Repository throws → BaseOutboundAdapter wraps → InfraError
    → UseCase (passthrough or throw UseCaseError/DomainError)
    → BaseInboundAdapter.execute()
        PASSTHROUGH: ObjectValidationError, UseCaseError, DomainError, InfraError
        WRAP others → UseCaseError
    → Route Handler
        Schema validation fails → ObjectValidationError
        PASSTHROUGH: all CodedError
    → Framework error handler (onionErrorHandler) → mapErrorToResponse()
```

**Principle:** Known errors passthrough; unknown errors wrap at each boundary.

---

## Domain Layer

| Class                       | Use When                                      |
| --------------------------- | --------------------------------------------- |
| `BaseEntity<TId, TProps>`   | Identity-based, mutable state, versioning     |
| `BaseAggregateRoot`         | Entity + domain event collection              |
| `BaseValueObject<T>`        | Immutable, compared by value, self-validating |
| `BaseDomainEvent<TPayload>` | Immutable event record (deep frozen)          |

**Built-in VOs:** `BaseUuidV4Vo`, `BaseUuidV7Vo`, `BaseEmailVo`, `BaseShortTextVo`, `BaseMediumTextVo`, `BaseLongTextVo`, `BasePaginationVo`, `BaseAuditByVo`, `BaseAuditOnVo`

> **Search:** For VO constraints/validation, read `packages/onion-lasagna/src/backend/core/onion-layers/domain/value-objects/*.ts`

**Pattern:** Always use static `create()` factory, private constructor, validate before construction.

---

## Application Layer

| Class                              | Purpose                                               |
| ---------------------------------- | ----------------------------------------------------- |
| `BaseInboundPort<TInDto, TOutDto>` | Use case interface                                    |
| `BaseInboundAdapter`               | Implements port, wraps `handle()` with error handling |

**Errors:** `UseCaseError`, `NotFoundError` (404), `ConflictError` (409), `UnprocessableError` (422)

> **Search:** For error handling logic, read `packages/onion-lasagna/src/backend/core/onion-layers/app/classes/base-inbound-adapter.class.ts`

---

## Infrastructure Layer

| Class                 | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `BaseOutboundAdapter` | Auto-wraps ALL methods with error handling |

Override `createInfraError(error, methodName)` to customize error type.

**Errors:** `InfraError`, `DbError`, `NetworkError`, `TimeoutError`, `ExternalServiceError`

> **Search:** For wrapping mechanism, read `packages/onion-lasagna/src/backend/core/onion-layers/infra/classes/base-outbound-adapter.class.ts`

---

## Presentation Layer (HTTP Routes)

Use `serverRoutes()` builder for type-safe route handling:

```typescript
import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';

const routes = serverRoutes(projectRouter)
  .handle('projects.create', {
    requestMapper: (req, ctx) => ({ name: req.body.name, createdBy: ctx.userId }),
    useCase: createProjectUseCase,
    responseMapper: (output) => ({ status: 201 as const, body: { id: output.id } }),
  })
  .build();
```

**Pipeline:** requestMapper → useCase.execute() → responseMapper

**HTTP Types (from `@cosmneo/onion-lasagna/http/server`):**

- `RawHttpRequest` - body, headers, query, pathParams
- `ValidatedRequest<T>` - typed request after schema validation
- `HandlerResponse` - status, headers, body

**Errors:** `AccessDeniedError` (403), `InvalidRequestError` (400)

> **Search:** For server routes, read `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/server/`

---

## Error → HTTP Mapping

| Error                                          | Status | Masked                     |
| ---------------------------------------------- | ------ | -------------------------- |
| `ObjectValidationError`, `InvalidRequestError` | 400    | No (includes field errors) |
| `UseCaseError`                                 | 400    | No                         |
| `AccessDeniedError`                            | 403    | No                         |
| `NotFoundError`                                | 404    | No                         |
| `ConflictError`                                | 409    | No                         |
| `UnprocessableError`                           | 422    | No                         |
| `DomainError`, `InfraError`, `ControllerError` | 500    | **Yes** (security)         |

> **Search:** For mapping logic, grep `mapErrorToResponse` or `mapErrorToHttpException` in `packages/onion-lasagna/src/backend/frameworks/`

---

## Schema Adapters (Validation)

Schema adapters wrap validation libraries for use in route definitions:

| Library | Adapter Function  | Import Path                                  |
| ------- | ----------------- | -------------------------------------------- |
| Zod     | `zodSchema()`     | `@cosmneo/onion-lasagna/http/schema/zod`     |
| TypeBox | `typeboxSchema()` | `@cosmneo/onion-lasagna/http/schema/typebox` |

**Usage in route definitions:**

```typescript
import { zodSchema, z } from '@cosmneo/onion-lasagna/http/schema/zod';

const route = defineRoute({
  request: { body: { schema: zodSchema(z.object({ name: z.string() })) } },
});
```

> **Search:** For schema implementations, read `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/schema/`

---

## Framework Integrations

All follow pattern:

```typescript
register*Routes(app, routes, { prefix?, middlewares?, contextExtractor? })
app.onError(onionErrorHandler) // or equivalent
```

| Framework | Import Path                                      | Key Exports                                                          |
| --------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| Hono      | `@cosmneo/onion-lasagna/http/frameworks/hono`    | `registerHonoRoutes`, `onionErrorHandler`, `mapErrorToHttpException` |
| Elysia    | `@cosmneo/onion-lasagna/http/frameworks/elysia`  | `registerElysiaRoutes`, `onionErrorHandler`, `mapErrorToResponse`    |
| Fastify   | `@cosmneo/onion-lasagna/http/frameworks/fastify` | `registerFastifyRoutes`, `onionErrorHandler`, `mapErrorToResponse`   |
| NestJS    | `@cosmneo/onion-lasagna/http/frameworks/nestjs`  | `OnionExceptionFilter`, `@OnionRequest()`, `mapErrorToResponse`      |

> **Search:** For integration details, read `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/frameworks/*/index.ts`

---

## Package Exports

> **IMPORTANT:** Always verify actual exports by reading the index.ts files. Do not assume.

| Entry Point                                        | Purpose                                     |
| -------------------------------------------------- | ------------------------------------------- |
| `@cosmneo/onion-lasagna/backend/core/onion-layers` | Domain, App, Infra layer classes            |
| `@cosmneo/onion-lasagna/backend/core/global`       | DTOs, errors, validators                    |
| `@cosmneo/onion-lasagna/backend/core/presentation` | Presentation layer utilities                |
| `@cosmneo/onion-lasagna/http`                      | HTTP types and utilities                    |
| `@cosmneo/onion-lasagna/http/route`                | `defineRoute`, `defineRouter`               |
| `@cosmneo/onion-lasagna/http/server`               | `serverRoutes`, route handlers              |
| `@cosmneo/onion-lasagna/http/schema/zod`           | Zod schema adapter                          |
| `@cosmneo/onion-lasagna/http/schema/typebox`       | TypeBox schema adapter                      |
| `@cosmneo/onion-lasagna/http/frameworks/*`         | Framework adapters (hono, etc.)             |
| `@cosmneo/onion-lasagna/http/react-query`          | React Query hooks (`createReactQueryHooks`) |
| `@cosmneo/onion-lasagna/http/openapi`              | OpenAPI generation                          |

---

## Decision Quick Reference

**Which base class?**

- Unique identity + mutable → `BaseEntity`
- Entity + consistency boundary → `BaseAggregateRoot`
- Immutable + value comparison → `BaseValueObject`
- Past occurrence record → `BaseDomainEvent`

**Which error?**

- Business rule violation → `InvariantViolationError`
- Resource not found → `NotFoundError`
- Duplicate/conflict → `ConflictError`
- Valid but not processable → `UnprocessableError`
- DB failure → `DbError`
- Network failure → `NetworkError`
- API timeout → `TimeoutError`
- External service failure → `ExternalServiceError`
- No permission → `AccessDeniedError`
- Bad request data → `InvalidRequestError`

**When to validate?**

- External input → Always validate
- Internal DTO → `SKIP_DTO_VALIDATION`
- Value Object factory → Always (in `create()`)

---

## Testing

> **Search:** For testing patterns and mocks, read test files in `packages/onion-lasagna/src/backend/core/**/tests/` and `examples/my-todo-app/`

**Mock pattern:** Mock repository ports, inject into use case, assert on calls and results.

---

## Code Style

- TypeScript strict + `noUncheckedIndexedAccess`
- Interfaces over types
- Type-only imports
- No `any`, no unused imports, no `console.log`
- Prettier: single quotes, semicolons, trailing commas, 100 chars, LF

---

## Reference Implementation

> **Search:** For real-world usage patterns, explore `examples/my-todo-app/packages/backend/bounded-contexts/`

This example shows complete implementation of entities, use cases, repositories, controllers, and route registration.
