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

| Layer | Path | Purpose |
|-------|------|---------|
| Domain | `onion-layers/domain/` | Entities, VOs, Events, business rules |
| App | `onion-layers/app/` | Use cases, ports, adapters |
| Infra | `onion-layers/infra/` | Repositories, external services |
| Presentation | `onion-layers/presentation/` | Controllers, HTTP mapping |
| Global | `global/` | DTOs, errors, validators |
| Frameworks | `frameworks/` | Hono, Elysia, Fastify, NestJS |

> **Search:** For actual exports and classes, grep `packages/onion-lasagna/src/backend/core/**/index.ts`

---

## Data Flow

```
HTTP Request → Framework Adapter → extractRequest() → HttpRequest
    → requestDtoFactory() → RequestDto (validated)
    → Controller.execute()
        → [GuardedController] accessGuard()
        → mapRequest() → InputDto
        → useCase.execute()
            → BaseInboundAdapter.handle()
            → Domain ops + Repository calls
            → OutputDto
        → mapResponse() → ResponseDto
    → HttpResponse → Framework sends response
```

## Error Flow

```
Repository throws → BaseOutboundAdapter wraps → InfraError
    → UseCase (passthrough or throw UseCaseError/DomainError)
    → BaseInboundAdapter.execute()
        PASSTHROUGH: ObjectValidationError, UseCaseError, DomainError, InfraError
        WRAP others → UseCaseError
    → Controller.execute()
        mapRequest(): ObjectValidationError → InvalidRequestError
        PASSTHROUGH: all CodedError
        WRAP others → ControllerError
    → Framework error handler → mapErrorToResponse()
```

**Principle:** Known errors passthrough; unknown errors wrap at each boundary.

---

## Domain Layer

| Class | Use When |
|-------|----------|
| `BaseEntity<TId, TProps>` | Identity-based, mutable state, versioning |
| `BaseAggregateRoot` | Entity + domain event collection |
| `BaseValueObject<T>` | Immutable, compared by value, self-validating |
| `BaseDomainEvent<TPayload>` | Immutable event record (deep frozen) |

**Built-in VOs:** `BaseUuidV4Vo`, `BaseUuidV7Vo`, `BaseEmailVo`, `BaseShortTextVo`, `BaseMediumTextVo`, `BaseLongTextVo`, `BasePaginationVo`, `BaseAuditByVo`, `BaseAuditOnVo`

> **Search:** For VO constraints/validation, read `packages/onion-lasagna/src/backend/core/onion-layers/domain/value-objects/*.ts`

**Pattern:** Always use static `create()` factory, private constructor, validate before construction.

---

## Application Layer

| Class | Purpose |
|-------|---------|
| `BaseInboundPort<TInDto, TOutDto>` | Use case interface |
| `BaseInboundAdapter` | Implements port, wraps `handle()` with error handling |

**Errors:** `UseCaseError`, `NotFoundError` (404), `ConflictError` (409), `UnprocessableError` (422)

> **Search:** For error handling logic, read `packages/onion-lasagna/src/backend/core/onion-layers/app/classes/base-inbound-adapter.class.ts`

---

## Infrastructure Layer

| Class | Purpose |
|-------|---------|
| `BaseOutboundAdapter` | Auto-wraps ALL methods with error handling |

Override `createInfraError(error, methodName)` to customize error type.

**Errors:** `InfraError`, `DbError`, `NetworkError`, `TimeoutError`, `ExternalServiceError`

> **Search:** For wrapping mechanism, read `packages/onion-lasagna/src/backend/core/onion-layers/infra/classes/base-outbound-adapter.class.ts`

---

## Presentation Layer

| Class | Purpose |
|-------|---------|
| `BaseController` | Pipeline: requestMapper → useCase → responseMapper |
| `GuardedController` | Adds accessGuard before pipeline |

**HTTP Types:**
- `HttpRequest` - body, headers, queryParams, pathParams
- `ContextualHttpRequest<T>` - extends HttpRequest with context
- `HttpResponse` - statusCode, headers, body

**Errors:** `ControllerError`, `AccessDeniedError` (403), `InvalidRequestError` (400)

> **Search:** For controller implementation, read `packages/onion-lasagna/src/backend/core/onion-layers/presentation/classes/`

---

## Error → HTTP Mapping

| Error | Status | Masked |
|-------|--------|--------|
| `ObjectValidationError`, `InvalidRequestError` | 400 | No (includes field errors) |
| `UseCaseError` | 400 | No |
| `AccessDeniedError` | 403 | No |
| `NotFoundError` | 404 | No |
| `ConflictError` | 409 | No |
| `UnprocessableError` | 422 | No |
| `DomainError`, `InfraError`, `ControllerError` | 500 | **Yes** (security) |

> **Search:** For mapping logic, grep `mapErrorToResponse` or `mapErrorToHttpException` in `packages/onion-lasagna/src/backend/frameworks/`

---

## Validation

**Strategy pattern:** `ObjectValidatorPort` → `BoundValidator<T>`

| Library | Factory |
|---------|---------|
| Zod | `createZodValidator(schema)` |
| ArkType | `createArktypeValidator(schema)` |
| Valibot | `createValibotValidator(schema)` |
| TypeBox | `createTypeboxValidator(schema)` |

**DTO pattern:**
```typescript
new SomeDto(data, validator)           // Validate external input
new SomeDto(data, SKIP_DTO_VALIDATION) // Skip for internal/trusted data
```

> **Search:** For validator implementations, read `packages/onion-lasagna/src/backend/core/validators/*/`

---

## Framework Integrations

All follow pattern:
```typescript
register*Routes(app, routes, { prefix?, middlewares?, contextExtractor? })
app.onError(onionErrorHandler) // or equivalent
```

| Framework | Path | Key Exports |
|-----------|------|-------------|
| Hono | `frameworks/hono/` | `registerHonoRoutes`, `onionErrorHandler`, `mapErrorToHttpException` |
| Elysia | `frameworks/elysia/` | `registerElysiaRoutes`, `onionErrorHandler`, `mapErrorToResponse` |
| Fastify | `frameworks/fastify/` | `registerFastifyRoutes`, `onionErrorHandler`, `mapErrorToResponse` |
| NestJS | `frameworks/nestjs/` | `BaseNestController`, `@OnionLasagnaRequest()`, `OnionLasagnaExceptionFilter`, `OnionLasagnaResponseInterceptor` |

> **Search:** For integration details, read `packages/onion-lasagna/src/backend/frameworks/*/index.ts` and README.md files

---

## Package Exports

> **IMPORTANT:** Always verify actual exports by reading the index.ts files. Do not assume.

| Entry Point | Search Location |
|-------------|-----------------|
| `@cosmneo/onion-lasagna/backend/core/onion-layers` | `src/backend/core/onion-layers/index.ts` |
| `@cosmneo/onion-lasagna/backend/core/global` | `src/backend/core/global/index.ts` |
| `@cosmneo/onion-lasagna/backend/core/presentation` | `src/backend/core/onion-layers/presentation/index.ts` |
| `@cosmneo/onion-lasagna/backend/core/validators/*` | `src/backend/core/validators/*/index.ts` |
| `@cosmneo/onion-lasagna/backend/frameworks/*` | `src/backend/frameworks/*/index.ts` |

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
