# Remaining Code Quality Issues

## Summary

| Priority | Count | Category |
|----------|-------|----------|
| High | 6 | Type Safety |
| Medium | 5 | Error Handling |
| **Total** | **11** | |

---

## High Priority - Type Safety

### 1. ✅ Double Type Casts in CodedError

**File:** `src/backend/core/global/exceptions/coded-error.error.ts:14`

```typescript
(this as unknown as { cause?: unknown }).cause = cause;
```

**Problem:** Double cast bypasses TypeScript's type system entirely.

**Fix:** Use `Object.defineProperty()` or ES2022 `ErrorOptions`.

**Status:** Fixed using `Object.defineProperty()`.

---

### 2. Double Type Casts in BaseOutboundAdapter

**File:** `src/backend/core/bounded-context/infra/classes/base-outbound-adapter.class.ts:30, 76`

```typescript
((this as unknown as { [OUTBOUND_WRAPPED_METHODS]?: string[] })...
```

**Problem:** Symbol property access requires unsafe casting.

**Fix:** Use WeakMap or typed Symbol helper functions.

---

### 3. ✅ Promise Duck-typing Vulnerability

**File:** `src/backend/core/bounded-context/infra/classes/base-outbound-adapter.class.ts:35-46`

```typescript
if (result && typeof (result as { then?: unknown }).then === 'function')
```

**Problem:** Any object with a `then` property passes the check; sync methods returning thenables become async.

**Fix:** Use `result instanceof Promise`.

**Status:** Fixed using `result instanceof Promise`.

---

### 4. ✅ Unsafe Type Assertion in BaseInboundAdapter

**File:** `src/backend/core/bounded-context/app/classes/base-inbound-adapter.class.ts:17`

```typescript
return await this.handle(input as TInDto);
```

**Problem:** Cast from `BaseDto<TInput>` to `TInDto` without validation.

**Fix:** Constrain generics with `TInDto extends BaseDto<TInput>`.

**Status:** Fixed by making both port and adapter generic over DTO types directly.

---

### 5. Unsafe Type Assertion in fieldChanged

**File:** `src/backend/core/global/utils/field-changed.util.ts:16`

```typescript
return value !== (newValue as T);
```

**Problem:** Casts potentially undefined value to `T`.

**Fix:** Use proper type narrowing instead of casting.

---

### 6. Unsafe Type Casts in GuardedController

**File:** `src/backend/core/bounded-context/presentation/classes/guarded-controller.ts:37, 54`

```typescript
this.accessGuard = accessGuard ?? (allowAllAccessGuard as AccessGuard<TRequest>);
```

**Problem:** Generic variance violation - `AccessGuard<unknown>` cast to `AccessGuard<TRequest>`.

**Fix:** Use generic factory function for default guard.

---

## Medium Priority - Error Handling

### 7. Missing ObjectValidationError Handling

**File:** `src/backend/core/bounded-context/app/classes/base-inbound-adapter.class.ts:18-30`

**Problem:** `ObjectValidationError` gets wrapped in `UseCaseError` instead of propagating.

**Fix:** Add explicit check for `ObjectValidationError` before wrapping.

---

### 8. Unused _methodName Parameter

**File:** `src/backend/core/bounded-context/infra/classes/base-outbound-adapter.class.ts:21`

```typescript
protected createInfraError(error: unknown, _methodName: string): InfraError {
```

**Problem:** Parameter exists but not used in error context - missed debugging opportunity.

**Fix:** Include method name in error message for better debugging.

---

### 9. Path Formatting Inconsistencies

**Files:** All `object-validator.*.ts` files

**Problem:** Different validators format error paths differently (Zod vs ArkType vs TypeBox vs Valibot).

**Fix:** Extract shared `formatPath` utility function.

---

### 10. Missing Defensive Checks in Error Transformation

**Files:** All `object-validator.*.ts` (~lines 20-30)

**Problem:** No fallbacks if error properties are missing.

**Fix:** Add optional chaining and fallback values:
```typescript
field: formatPath(error?.path ?? 'unknown'),
message: error?.message ?? 'Validation failed',
```

---

### 11. Prototype Chain Walking Risk

**File:** `src/backend/core/bounded-context/infra/classes/base-outbound-adapter.class.ts:61-74`

**Problem:** No guards against wrapping getters/setters during prototype walking.

**Fix:** Check property descriptors before wrapping:
```typescript
const descriptor = Object.getOwnPropertyDescriptor(proto, key);
if (descriptor?.get || descriptor?.set) continue;
```
