# Task: Refactor HTTP Layer for 100% Type-Safe Inference

## Objective

Investigate the current unified HTTP layer implementation and design a refactor that achieves **100% automatic type inference** in server handlers. After implementation, migrate `my-todo-app` to use the refactored system.

---

## Current Problem

The unified HTTP layer has type inference limitations that require manual type annotations as workarounds:

```typescript
// Current state: Type inference breaks through router types
// Developers must use escape hatches:

type Req = any; // ❌ Escape hatch because req type is lost

interface AuthContext { // ❌ Manual interface because ctx is unknown
  userId: string;
}

'projects.create': {
  requestMapper: (req: Req, ctx: AuthContext) => ({ // ❌ Manual annotations
    name: req.body.name,
    createdBy: ctx.userId,
  }),
  useCase: createProjectUseCase,
  responseMapper: (output: CreateProjectOutput) => ({ // ❌ Manual annotation
    status: 201 as const,
    body: { projectId: output.projectId },
  }),
}
```

**Desired state:**

```typescript
// Goal: Full automatic inference, zero manual annotations

'projects.create': {
  requestMapper: (req, ctx) => ({  // ✅ req.body typed from route schema
    name: req.body.name,           // ✅ Autocomplete works
    createdBy: ctx.userId,         // ✅ ctx typed from route's context schema
  }),
  useCase: createProjectUseCase,
  responseMapper: (output) => ({   // ✅ output inferred from useCase
    status: 201 as const,
    body: { projectId: output.projectId },
  }),
}
```

---

## Root Causes to Investigate

1. **Complex mapped types** - `GetRoute<Router, Key>` loses type information when TypeScript evaluates the conditional types

2. **Heterogeneous handler config** - `ServerRoutesConfig` uses `any` for TInput/TOutput because each route has different types:

   ```typescript
   export type ServerRoutesConfig<T extends RouterConfig> = {
     [K in RouterKeys<T>]: RouteHandlerConfig<GetRoute<T, K>, any, any>;
   };
   ```

3. **Conditional type inference** - The return type inference in `defineRoute` was complex and didn't work reliably through nested object types

4. **Type parameter propagation** - When routes go through `RouterConfig` → `RouterEntry` → `GetRoute`, specific types widen to `unknown`

---

## Files to Investigate

### Core Types

- `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/route/types/route-definition.type.ts`
- `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/route/types/router-definition.type.ts`
- `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/route/define-route.ts`
- `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/route/define-router.ts`

### Server Implementation

- `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/server/types.ts`
- `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/server/create-server-routes.ts`

### Schema Adapters

- `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/schema/types/schema-adapter.type.ts`
- `packages/onion-lasagna/src/backend/core/onion-layers/presentation/http/schema/adapters/zod.adapter.ts`

### Current Workarounds (see the problem in action)

- `my-todo-app/packages/backend/bounded-contexts/project-management/presentation/http/handlers.ts`

### Documentation

- `packages/onion-lasagna/docs/unified-http-layer.md` (see "Type Inference" section under Limitations)

---

## Constraints

1. **Preserve the API** - The `defineRoute`, `defineRouter`, `createServerRoutes` API should remain similar (breaking changes are acceptable if justified)

2. **Runtime behavior unchanged** - Validation pipeline must continue working as-is

3. **No code generation** - Solution must be pure TypeScript types, no build-time codegen

4. **Maintain performance** - Type checking should not become prohibitively slow

5. **Test coverage** - All 795 existing tests must pass after refactor

---

## Possible Approaches to Explore

### 1. Branded Types / Phantom Types

Use branded types to preserve route identity through transformations.

### 2. Builder Pattern

Replace object literal config with a builder that preserves types at each step:

```typescript
createServerRoutes(router)
  .handle('projects.create', {
    requestMapper: (req, ctx) => ..., // Types inferred here
    useCase: ...,
    responseMapper: ...,
  })
  .build();
```

### 3. Function Overloads

Use function overloads to provide specific type inference per route key.

### 4. Mapped Type Restructuring

Restructure how `ServerRoutesConfig` maps route keys to preserve individual route types.

### 5. Proxy-Based Inference

Use a Proxy-like type pattern where accessing `handlers['projects.create']` returns the correctly typed handler config.

### 6. Template Literal Type Keys

Leverage template literal types differently to maintain type relationships.

### 7. Separate Handler Definition

Define handlers individually with full inference, then combine:

```typescript
const createHandler = defineHandler(routes.projects.create, {
  requestMapper: (req, ctx) => ..., // Full inference
  useCase: ...,
  responseMapper: ...,
});

createServerRoutes(router, { 'projects.create': createHandler, ... });
```

---

## Deliverables

### Phase 1: Investigation

1. Deep dive into current type flow
2. Identify exactly where type information is lost
3. Document findings

### Phase 2: Design

1. Propose refactored type architecture
2. Show how inference will work at each step
3. Consider trade-offs and alternatives

### Phase 3: Implementation

1. Implement the refactor in `packages/onion-lasagna`
2. Ensure all tests pass
3. Update documentation

### Phase 4: Migration

1. Update `my-todo-app/packages/backend/bounded-contexts/project-management/presentation/http/handlers.ts`
2. Remove all manual type annotations
3. Verify full type inference works
4. Ensure the app builds and runs

---

## Success Criteria

1. **Zero escape hatches** - No `any`, no manual type annotations in handlers
2. **Full autocomplete** - IDE shows correct types for `req.body`, `req.query`, `ctx`, `output`
3. **Type errors catch bugs** - Wrong property access on `req.body` shows TypeScript error
4. **Tests pass** - All 795 tests green
5. **App works** - `my-todo-app` builds and runs correctly

---

## Commands

```bash
# Working directories
cd /Users/bernardocabral/Projects/Personal/onion-lasagna-workspace/onion-lasagna
cd /Users/bernardocabral/Projects/Personal/onion-lasagna-workspace/my-todo-app

# Build library
cd packages/onion-lasagna && bun run build

# Run tests
cd packages/onion-lasagna && bun run test:run

# Build my-todo-app
cd my-todo-app && bun run build
```

---

## Notes

- Use `bun` for all commands (not npm/node)
- The library is `@cosmneo/onion-lasagna`
- my-todo-app uses the library via workspace link
- Read CLAUDE.md in the onion-lasagna root for codebase conventions
