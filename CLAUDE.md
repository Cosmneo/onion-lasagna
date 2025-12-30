# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

```
onion-lasagna/
├── packages/
│   └── onion-lasagna/     # Library (@cosmneo/onion-lasagna)
│       ├── src/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── vitest.config.ts
├── apps/
│   └── docs/              # Next.js documentation site
├── starters/              # Project templates (not in workspaces)
│   ├── simple-clean-starter/
│   └── modules-clean-starter/
├── package.json           # Workspace root (private)
├── turbo.json
└── eslint.config.mjs
```

## Commands

```bash
# Root commands (turbo-orchestrated)
bun install          # Install all workspace dependencies
bun run build        # Build all packages (library + docs)
bun run dev          # Dev mode for all packages
bun run lint         # Lint all packages
bun run lint:fix     # Auto-fix ESLint issues
bun run test         # Run tests (watch mode)
bun run test:run     # Run tests once
bun run format       # Format with Prettier
bun run format:check # Check formatting

# Package-specific
cd packages/onion-lasagna && bun run build  # Build library only
cd apps/docs && bun dev                      # Docs dev server
```

## Runtime Requirements

Always use Bun instead of Node.js, npm, pnpm, or Vite:

- `bun <file>` instead of `node` or `ts-node`
- `bun install` instead of npm/yarn/pnpm install
- Bun auto-loads `.env` - don't use dotenv

## Architecture

This is an **Onion/Hexagonal Architecture** library providing base classes for DDD-style backend applications.

### Layer Structure (`packages/onion-lasagna/src/backend/core/`)

```
onion-layers/
├── domain/       # Business rules: BaseEntity, BaseAggregateRoot, BaseValueObject, BaseDomainEvent
├── app/          # Use cases: BaseInboundAdapter implements BaseInboundPort
├── infra/        # Repositories: BaseOutboundAdapter (auto-wraps methods with error handling)
└── presentation/ # Controllers: BaseController, GuardedController (with access guard)

global/           # Cross-cutting: BaseDto, CodedError, ObjectValidatorPort

validators/
├── zod/          # Zod validator implementation
├── arktype/      # ArkType validator implementation
├── valibot/      # Valibot validator implementation
└── typebox/      # TypeBox validator implementation
```

### Built-in Value Objects (`onion-layers/domain/value-objects/`)

- **Text:** BaseShortTextVo, BaseMediumTextVo, BaseLongTextVo
- **Identifiers:** BaseUuidV4Vo, BaseUuidV7Vo
- **Contact:** BaseEmailVo
- **Pagination:** BasePaginationVo
- **Auditing:** BaseAuditByVo, BaseAuditOnVo

### Key Patterns

**Ports & Adapters:**

- `BaseInboundPort<TInDto extends BaseDto, TOutDto extends BaseDto>` - primary port interface for use cases (DTOs required at boundaries)
- `BaseInboundAdapter` - implements port, wraps handle() with error catching
- `BaseOutboundAdapter` - secondary adapter, auto-wraps all methods to convert errors to InfraError

**Error Hierarchy:**

```
CodedError (base with code + cause)
├── DomainError (invariant violations)
│   ├── InvariantViolationError
│   └── PartialLoadError
├── UseCaseError (Conflict, NotFound, Unprocessable)
├── InfraError (DbError, NetworkError, TimeoutError, ExternalServiceError)
├── ControllerError
├── AccessDeniedError
├── InvalidRequestError
└── ObjectValidationError
```

**Validator Strategy:**

- `ObjectValidatorPort` abstraction allows swapping between Zod, ArkType, Valibot, and TypeBox
- All create `BoundValidator<T>` injected into BaseDto and BaseValueObject
- Use `SKIP_DTO_VALIDATION` to bypass DTO validation (VOs use built-in TypeScript validation)

**Controllers:**

- `BaseController` - simple pipeline: requestMapper → useCase → responseMapper. Converts `ObjectValidationError` from DTOs to `InvalidRequestError`
- `GuardedController` - extends BaseController with built-in access guard via `accessGuard` config option

### Framework Integrations (`packages/onion-lasagna/src/backend/frameworks/`)

**Hono Integration:**

- `registerHonoRoutes(app, routes, options?)` - register routes with optional middlewares
- `onionErrorHandler` - error handler for `app.onError()`
- `mapErrorToHttpException` - converts domain errors to HTTPException
- Automatic path conversion: `{param}` → `:param`

**Elysia Integration:**

- `registerElysiaRoutes(app, routes, options?)` - register routes with optional middlewares
- `onionErrorHandler` - error handler plugin
- `mapErrorToResponse` - converts domain errors to Elysia response

**Fastify Integration:**

- `registerFastifyRoutes(app, routes, options?)` - register routes with optional middlewares
- `onionErrorHandler` - error handler for `setErrorHandler()`
- `mapErrorToResponse` - converts domain errors to Fastify response

**NestJS Integration:**

- `@OnionLasagnaRequest()` - parameter decorator extracting HttpRequest from NestJS request
- `OnionLasagnaExceptionFilter` - exception filter mapping onion errors to HTTP responses
- `OnionLasagnaResponseInterceptor` - intercepts HttpResponse and maps to NestJS response
- `BaseNestController` - base controller class for NestJS integration

### Package Exports

```typescript
// Core layers
import { ... } from '@cosmneo/onion-lasagna/backend/core/onion-layers'
import { ... } from '@cosmneo/onion-lasagna/backend/core/global'
import { ... } from '@cosmneo/onion-lasagna/backend/core/presentation'

// Validators (pick one)
import { ... } from '@cosmneo/onion-lasagna/backend/core/validators/zod'
import { ... } from '@cosmneo/onion-lasagna/backend/core/validators/arktype'
import { ... } from '@cosmneo/onion-lasagna/backend/core/validators/valibot'
import { ... } from '@cosmneo/onion-lasagna/backend/core/validators/typebox'

// Framework integrations
import { ... } from '@cosmneo/onion-lasagna/backend/frameworks/hono'
import { ... } from '@cosmneo/onion-lasagna/backend/frameworks/elysia'
import { ... } from '@cosmneo/onion-lasagna/backend/frameworks/fastify'
import { ... } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs'
```

## Code Style

- TypeScript strict mode with `noUncheckedIndexedAccess`
- Prefer interfaces over types (`consistent-type-definitions: error`)
- Use type-only imports (`consistent-type-imports: error`)
- No explicit `any` (warning)
- No unused imports (auto-fixed)
- No console.log (warning) - use console.warn/error/info instead
- Prettier: single quotes, semicolons, trailing commas, 100 char width, LF line endings
