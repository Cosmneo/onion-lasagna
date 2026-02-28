# CLAUDE.md

> **IMPORTANT:** When working with this library, ALWAYS search the codebase for actual implementations. DO NOT imagine or assume file contents, exports, or patterns. Use `Glob`, `Grep`, or `Read` tools to verify before making changes.

## Monorepo Structure

```
onion-lasagna/
├── packages/onion-lasagna/                    # Core library (@cosmneo/onion-lasagna)
├── packages/servers/
│   ├── onion-lasagna-hono/                    # @cosmneo/onion-lasagna-hono
│   ├── onion-lasagna-elysia/                  # @cosmneo/onion-lasagna-elysia
│   ├── onion-lasagna-express/                 # @cosmneo/onion-lasagna-express
│   ├── onion-lasagna-fastify/                 # @cosmneo/onion-lasagna-fastify
│   └── onion-lasagna-nestjs/                  # @cosmneo/onion-lasagna-nestjs
├── packages/schemas/
│   ├── onion-lasagna-zod/                     # @cosmneo/onion-lasagna-zod (v4)
│   ├── onion-lasagna-zod-v3/                  # @cosmneo/onion-lasagna-zod-v3
│   ├── onion-lasagna-typebox/                 # @cosmneo/onion-lasagna-typebox
│   ├── onion-lasagna-valibot/                 # @cosmneo/onion-lasagna-valibot
│   └── onion-lasagna-arktype/                 # @cosmneo/onion-lasagna-arktype
├── packages/clients/
│   ├── onion-lasagna-client/                  # @cosmneo/onion-lasagna-client
│   └── onion-lasagna-react-query/             # @cosmneo/onion-lasagna-react-query
├── packages/patterns/
│   └── onion-lasagna-saga/                    # @cosmneo/onion-lasagna-saga
├── packages/tooling/                          # CLI tools (out of scope)
├── apps/docs/                                 # Next.js docs site
├── starters/                                  # Project templates
└── examples/my-todo-app/                      # Reference implementation
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

## Core Library Source Layout

All paths relative to `packages/onion-lasagna/src/`:

| Layer        | Path              | Purpose                                |
| ------------ | ----------------- | -------------------------------------- |
| Domain       | `domain/`         | Entities, VOs, Events, business rules  |
| App          | `app/`            | Use cases, ports, inbound adapters     |
| Infra        | `infra/`          | Outbound adapters, error wrapping      |
| Presentation | `presentation/`   | HTTP route system, error mapping       |
| Global       | `global/`         | Shared errors, utils, validation types |

> **Search:** For exports and classes, grep `packages/onion-lasagna/src/**/index.ts`

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

> **Search:** For VO constraints/validation, read `packages/onion-lasagna/src/domain/value-objects/*.ts`

**Pattern:** Always use static `create()` factory, private constructor, validate before construction.

---

## Application Layer

| Class                              | Purpose                                               |
| ---------------------------------- | ----------------------------------------------------- |
| `BaseInboundPort<TInDto, TOutDto>` | Use case interface                                    |
| `BaseInboundAdapter`               | Implements port, wraps `handle()` with error handling |

**Errors:** `UseCaseError`, `NotFoundError` (404), `ConflictError` (409), `UnprocessableError` (422)

> **Search:** For error handling logic, read `packages/onion-lasagna/src/app/classes/base-inbound-adapter.class.ts`

---

## Infrastructure Layer

| Class                 | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `BaseOutboundAdapter` | Auto-wraps ALL methods with error handling |

Override `createInfraError(error, methodName)` to customize error type.

**Errors:** `InfraError`, `DbError`, `NetworkError`, `TimeoutError`, `ExternalServiceError`

> **Search:** For wrapping mechanism, read `packages/onion-lasagna/src/infra/classes/base-outbound-adapter.class.ts`

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

> **Search:** For server routes, read `packages/onion-lasagna/src/presentation/http/server/`

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

> **Search:** For mapping logic, grep `mapErrorToResponse` in `packages/onion-lasagna/src/presentation/http/shared/`

---

## Schema Adapter Packages

Each schema adapter is a separate package:

| Library  | Package                          | Adapter Function    |
| -------- | -------------------------------- | ------------------- |
| Zod v4   | `@cosmneo/onion-lasagna-zod`     | `zodSchema()`       |
| Zod v3   | `@cosmneo/onion-lasagna-zod-v3`  | `zodSchema()`       |
| TypeBox  | `@cosmneo/onion-lasagna-typebox` | `typeboxSchema()`   |
| Valibot  | `@cosmneo/onion-lasagna-valibot` | `valibotSchema()`   |
| ArkType  | `@cosmneo/onion-lasagna-arktype` | `arktypeSchema()`   |

> **Search:** For schema implementations, read `packages/schemas/*/src/`

---

## Server Framework Packages

Each framework adapter is a separate package. All export `registerRoutes`, `onionErrorHandler`, and `mapErrorToResponse`:

| Framework | Package                           |
| --------- | --------------------------------- |
| Hono      | `@cosmneo/onion-lasagna-hono`     |
| Elysia    | `@cosmneo/onion-lasagna-elysia`   |
| Express   | `@cosmneo/onion-lasagna-express`  |
| Fastify   | `@cosmneo/onion-lasagna-fastify`  |
| NestJS    | `@cosmneo/onion-lasagna-nestjs`   |

> **Search:** For integration details, read `packages/servers/*/src/index.ts`

---

## Client Packages

| Package                              | Purpose                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `@cosmneo/onion-lasagna-client`      | Type-safe HTTP client from router definitions        |
| `@cosmneo/onion-lasagna-react-query` | React Query hooks from router definitions            |

**Key features of `createReactQueryHooks`:**
- GET/HEAD → `useQuery`, other methods → `useMutation`
- `queryKeyPrefix` for cache isolation
- `useEnabled` hook for global query gating (e.g., auth session readiness)
- `onRequest` interceptor for dynamic headers (Bearer tokens)

> **Search:** For client implementations, read `packages/clients/*/src/`

---

## Pattern Packages

| Package                          | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `@cosmneo/onion-lasagna-saga`    | Sequential saga orchestrator with compensation |

**Key features:** per-step retry, `exponentialBackoff(minMs, maxMs)` helper, compensation strategies, timeout + abort propagation, lifecycle hooks.

> **Search:** For saga implementation, read `packages/patterns/onion-lasagna-saga/src/`

---

## Core Package Exports

| Entry Point                        | Purpose                              |
| ---------------------------------- | ------------------------------------ |
| `@cosmneo/onion-lasagna`           | All layers (domain, app, infra, etc) |
| `@cosmneo/onion-lasagna/global`    | Shared errors, utils, types          |
| `@cosmneo/onion-lasagna/ports`     | Port interfaces                      |
| `@cosmneo/onion-lasagna/types`     | Shared type definitions              |
| `@cosmneo/onion-lasagna/http`      | HTTP types and utilities             |
| `@cosmneo/onion-lasagna/http/route`| `defineRoute`, `defineRouter`        |
| `@cosmneo/onion-lasagna/http/server`| `serverRoutes`, route handlers      |
| `@cosmneo/onion-lasagna/http/schema`| Schema adapter interface            |
| `@cosmneo/onion-lasagna/http/shared`| Error mapping, shared HTTP types    |
| `@cosmneo/onion-lasagna/http/openapi`| OpenAPI generation                 |

> **IMPORTANT:** Always verify actual exports by reading the index.ts files. Do not assume.

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

> **Search:** For testing patterns and mocks, read test files in `packages/onion-lasagna/src/**/tests/` and `examples/my-todo-app/`

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
