# Serverless-Onion Refactor Decisions

> **Status**: Decision log with implementation plan
> **Date**: 2025-12-25
> **Approach**: Step-by-step, one issue at a time

---

## Issue #1: Dual Error Hierarchy

### My Suggestion

Unify error hierarchies - extend onion-layers errors with HTTP status metadata and delete the HttpException classes.

### Your Decision

**Keep separate.** Serverless-onion should be a standalone framework with its own exceptions and logic, similar to how Hono has its own exception system. Future Hono adapter support planned.

### My Comments

Makes sense. If serverless-onion is positioned as a standalone framework (not just a thin adapter), having its own exception system is appropriate. This also:

- **Enables framework-specific features** - e.g., Hono-style `c.json()` shortcuts in the future
- **Cleaner integration story** - users of serverless-onion don't need to know about onion-layers internals
- **Easier Hono adapter** - if serverless-onion exceptions mirror Hono patterns, adapting is simpler

**Action**: No changes to exception hierarchy. Document that serverless-onion is a standalone framework.

---

## Issue #2: Code Duplication Between Runtimes

> **Status**: COMPLETED (2025-12-25)

### My Suggestion

**Solution A**: Extract platform-agnostic core with thin platform adapters.

### Your Decision

**Proceed with Solution A.**

### My Comments

Agreed. The refactor will:

1. Create `serverless-onion/core/` with shared logic
2. Create `serverless-onion/adapters/aws-lambda/` with AWS-specific code
3. Create `serverless-onion/adapters/cloudflare-workers/` with CF-specific code
4. Future adapters (Hono, Deno, Vercel) become trivial to add

**Action**: ~~Implement Solution A - extract platform-agnostic core.~~

### Implementation

Implemented in commit `42d7f4f`:
- Created `core/handlers/` with `createBaseHandler` and `createBaseProxyHandler` factories
- Created `core/handlers/types/` with `PlatformAdapter` and `PlatformProxyAdapter` interfaces
- Platform runtimes now use thin adapters that delegate to core handlers
- Added comprehensive JSDoc documentation

---

## Issue #3: Middleware Order Fragility

> **Status**: COMPLETED (2025-12-25)

### My Suggestion

**Solution A**: Builder pattern with type accumulation for compile-time order enforcement.

### Your Decision

**Proceed with Solution A.**

### My Comments

This will give us:

```typescript
const chain = createMiddlewareChain<Env, Request>()
  .add(authMiddleware) // Context: { userId: string }
  .add(tenantMiddleware) // Requires userId, adds tenantId
  .build();

// Compile error if order is wrong
```

**Action**: ~~Implement builder pattern for middleware chains.~~

### Implementation

Implemented in commit `e5e9b86`:
- Created `createMiddlewareChain()` builder with `.use()` and `.build()` methods
- Created `MiddlewareChainBuilder` interface with compile-time order validation
- Added `AnyMiddleware` type alias to handle TypeScript contravariance cleanly
- Created platform-specific builders for AWS and Cloudflare
- Uses `TRequired extends TAccumulatedContext` constraint for compile-time enforcement

Example:
```typescript
const chain = createMiddlewareChain<Env>()
  .use(authMiddleware)      // Context: {} → { userId }
  .use(tenantMiddleware)    // Context: { userId } → { userId, tenantId }
  .build();

// Compile error if wrong order:
createMiddlewareChain<Env>()
  .use(tenantMiddleware)    // ERROR: requires AuthContext
  .use(authMiddleware);     // Too late!
```

---

## Issue #4: Hardcoded CORS Configuration

### My Suggestion

Add configurable `CorsConfig` object to handler configuration.

### Your Decision

**Proceed with core config refactor** - CORS as part of a broader configuration system.

### My Comments

This suggests a unified config approach:

```typescript
// Core framework config
interface ServerlessOnionConfig {
  cors?: CorsConfig;
  logging?: LoggingConfig;
  // Future: timeouts, retries, etc.
}

export const handler = createLambdaHandler({
  controller,
  config: {
    cors: { origin: 'https://myapp.com', credentials: true },
  },
});
```

**Action**: Design and implement core configuration system with CORS as first feature.

---

## Issue #5: Greedy Proxy Anti-Pattern

### My Suggestion

Deprecate `createGreedyProxyHandler` and recommend platform-native routing.

### Your Decision

**Disagree - this IS the point of the framework.** Serverless-onion aims to provide what Hono does: an app router. The pattern:

1. Single endpoint = always warm (negates cold start concern)
2. Need app-like API: `app.registerRoutes()` or similar
3. Must ALSO support direct single-controller mode for cases where AWS routing is preferred

### My Comments

I misunderstood the vision. This isn't an anti-pattern if it's the core purpose. You want:

**Two modes:**

1. **App Router Mode** (like Hono) - single Lambda handles all routes

   ```typescript
   const app = createApp<Env>();
   app.registerRoutes(userRoutes);
   app.registerRoutes(orderRoutes);
   export const handler = app.handle;
   ```

2. **Direct Controller Mode** - bypass router for AWS-native routing
   ```typescript
   // Deployed to specific API Gateway route
   export const handler = createLambdaHandler({ controller: getUserController });
   ```

**Current implementation issues to discuss:**

- API ergonomics (`createGreedyProxyHandler` is clunky vs `app.get()`)
- Route registration pattern
- How to share middleware between modes
- Whether to support Hono-style `app.get('/users/:id', handler)` syntax

**Action**: Redesign as proper app router with better API. Discuss patterns further.

---

## Issue #6: Over-Abstracted Exception Handling

### My Suggestion

Flatten from 5 transformation layers to a single `handleError()` function.

### Your Decision

**I got it wrong.** `HttpException.toResponse()` does NOT happen before `withExceptionHandler`. Need to investigate deeper.

### My Comments

Let me re-trace the actual flow. You're right - I need to look at this more carefully.

**Current flow (to verify):**

```
1. Handler executes
2. Error thrown
3. withExceptionHandler catches
4. mapErrorToException() converts to HttpException
5. mapExceptionToResponse() creates platform response
```

So `toResponse()` may be called INSIDE `mapExceptionToResponse()`, not before.

**Action**: Re-investigate the actual exception flow before proposing changes. Will trace through the code.

---

## Issue #7: No Test Coverage

### My Suggestion

Comprehensive test suite as P0 priority.

### Your Decision

**Noted - will be handled later.**

### My Comments

Understood. Tests will be added after the refactoring decisions are finalized. Makes sense to not write tests for code that's about to change.

**Action**: Defer. Add tests after refactoring is complete.

---

## Issue #8: Middleware Context Key Collisions

> **Status**: COMPLETED (2025-12-25)

### My Suggestion

Solution A (namespacing) + Solution B (runtime warnings).

### Your Decision

**Proceed with Solution A** (namespacing convention).

### My Comments

Will enforce via:

1. Documentation requiring namespaced keys
2. Example middlewares using namespaces
3. Optional: lint rule or runtime warning for flat keys

```typescript
// Good
const authMiddleware = defineMiddleware<{ auth: { user: User } }>();

// Bad (documented as anti-pattern)
const authMiddleware = defineMiddleware<{ user: User }>();
```

**Action**: ~~Implement namespacing convention in middleware examples and docs.~~

### Implementation

Updated all middleware documentation and examples to use namespaced keys:

1. **README.md**: Added "Context Namespacing Convention" section with:
   - Best practice examples showing namespaced keys
   - Anti-pattern examples showing flat key collisions
   - Benefits explanation (clear ownership, self-documenting, safe merging)

2. **Core define-middleware.ts**: Updated JSDoc with namespaced examples

3. **AWS define-middleware.ts**: Updated JSDoc with namespaced examples

4. **Cloudflare define-middleware.ts**: Updated JSDoc with namespaced examples

5. **All middleware examples**: Updated to use pattern:
   ```typescript
   interface AuthContext {
     auth: { userId: string; roles: string[] };
   }
   // Access: ctx.auth.userId
   ```

---

## Implementation Order

Based on your decisions:

| Step | Issue | Action                                                                 | Status      |
| ---- | ----- | ---------------------------------------------------------------------- | ----------- |
| 1    | #5    | **Discuss app router design** - this affects everything else           | Pending     |
| 2    | #6    | **Investigate exception flow** - understand before changing            | Pending     |
| 3    | #2    | **Extract platform-agnostic core** - enables cleaner #5 implementation | ✅ DONE     |
| 4    | #3    | **Middleware chain builder** - can be done with #2                     | ✅ DONE     |
| 5    | #4    | **Core config system** - builds on new core structure                  | Pending     |
| 6    | #8    | **Namespace convention** - documentation + examples                    | ✅ DONE     |
| 7    | #1    | **No action** - keep separate exceptions                               | ✅ No action |
| 8    | #7    | **Tests** - after refactoring stabilizes                               | Pending     |

---

## Next Steps

Ready to dive into **Issue #5** first - the app router design. This is foundational and will inform the other refactors.

Questions to discuss:

1. Should API mirror Hono exactly (`app.get()`, `app.post()`) or be different?
2. How do route groups work with middleware?
3. What's the export pattern for the handler?
4. How does this integrate with the existing `createRoutingMap`?
