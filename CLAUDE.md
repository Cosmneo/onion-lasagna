# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # Install dependencies
bun run build        # Build with tsup (outputs ESM + CJS with .d.ts)
bun run dev          # Watch mode for development
bun run lint         # Check ESLint errors
bun run lint:fix     # Auto-fix ESLint issues
bun run format       # Format with Prettier
bun run format:check # Check formatting
bun test             # Run tests (uses bun:test)
```

## Runtime Requirements

Always use Bun instead of Node.js, npm, pnpm, or Vite:

- `bun <file>` instead of `node` or `ts-node`
- `bun install` instead of npm/yarn/pnpm install
- `bun test` instead of jest/vitest
- Bun auto-loads `.env` - don't use dotenv

## Architecture

This is an **Onion/Hexagonal Architecture** library providing base classes for DDD-style backend applications.

### Layer Structure (`src/backend/core/`)

```
bounded-context/
├── domain/       # Business rules: BaseValueObject, value objects (Email, UUID, Text, Pagination)
├── app/          # Use cases: BaseInboundAdapter implements BaseInboundPort
├── infra/        # Repositories: BaseOutboundAdapter (auto-wraps methods with error handling)
└── presentation/ # Controllers: BaseController, GuardedController (with access guard)

global/           # Cross-cutting: BaseDto, CodedError, ObjectValidatorPort

validators/
├── zod/          # Zod validator implementation
└── arktype/      # ArkType validator implementation
```

### Key Patterns

**Ports & Adapters:**

- `BaseInboundPort<TInput, TOutput>` - primary port interface for use cases
- `BaseInboundAdapter` - implements port, wraps handle() with error catching
- `BaseOutboundAdapter` - secondary adapter, auto-wraps all methods to convert errors to InfraError

**Error Hierarchy:**

```
CodedError (base with code + cause)
├── DomainError (invariant violations)
├── UseCaseError (Conflict, NotFound, Unprocessable)
├── InfraError (DbError, NetworkError, TimeoutError)
├── ControllerError (AccessDenied, InvalidRequest)
└── ObjectValidationError
```

**Validator Strategy:**

- `ObjectValidatorPort` abstraction allows swapping between Zod and ArkType
- Both create `BoundValidator<T>` injected into BaseDto and BaseValueObject
- Use `SKIP_DTO_VALIDATION` or `SKIP_VALUE_OBJECT_VALIDATION` to bypass validation

**Controllers:**

- `BaseController` - simple pipeline: requestMapper → useCase → responseMapper. Converts `ObjectValidationError` from DTOs to `InvalidRequestError`
- `GuardedController` - extends BaseController with `@AllowRequest` decorator for access guard
- `@AllowRequest(accessGuard)` - checks access guard before execution

### Package Exports

```typescript
import { ... } from '@cosmneo/onion-lasagna/backend/core/bounded-context'
import { ... } from '@cosmneo/onion-lasagna/backend/core/global'
import { ... } from '@cosmneo/onion-lasagna/backend/core/validators/zod'
import { ... } from '@cosmneo/onion-lasagna/backend/core/validators/arktype'
```

## Code Style

- TypeScript strict mode with `noUncheckedIndexedAccess`
- Prefer interfaces over types (`consistent-type-definitions: error`)
- Use type-only imports (`consistent-type-imports: error`)
- No explicit `any` (warning)
- No unused imports (auto-fixed)
- Prettier: single quotes, semicolons, trailing commas, 100 char width
