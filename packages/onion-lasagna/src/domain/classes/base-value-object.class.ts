/**
 * Deep equality comparison for value objects.
 * Handles primitives, Dates, Arrays, and nested plain Objects.
 *
 * **Supported shapes:** primitives, `Date`, `Array`, and plain `Object` (including
 * nested combinations). `Map` and `Set` are compared by reference only.
 *
 * **Cycle safety:** a `WeakSet` visited-guard prevents infinite recursion on
 * cyclic object graphs; cycles cause the comparison to return `false` rather
 * than throwing a RangeError.
 *
 * @internal
 */
function deepEquals(a: unknown, b: unknown, visited = new WeakSet<object>()): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    // Cycle guard for arrays
    if (visited.has(a)) return false;
    visited.add(a);
    return a.every((item, index) => deepEquals(item, b[index], visited));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    // Cycle guard for objects
    if (visited.has(a as object)) return false;
    visited.add(a as object);
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEquals(aObj[key], bObj[key], visited));
  }
  return false;
}

/**
 * Deep-clones a value, handling primitives, Dates, Arrays, and plain Objects.
 *
 * **Supported shapes:** primitives, `Date`, `Array`, and plain objects (i.e.
 * objects whose prototype is `Object.prototype` or `null`).  Class instances
 * other than `Date` (e.g. nested Value Objects) are returned **by reference**
 * — they are themselves immutable and do not need cloning.
 *
 * **Cycle safety:** a `WeakMap` visited-guard returns the already-cloned
 * counterpart for cyclic references, preventing infinite recursion.
 *
 * @internal
 */
function deepClone<T>(value: T, visited = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return new Date((value as Date).getTime()) as unknown as T;
  }
  // Non-plain objects (class instances other than Date/Array) are immutable by
  // convention and returned by reference without cloning.
  const proto = Object.getPrototypeOf(value as object) as unknown;
  const isPlain = proto === Object.prototype || proto === null;
  if (!Array.isArray(value) && !isPlain) {
    return value;
  }
  if (visited.has(value as object)) {
    return visited.get(value as object) as T;
  }
  if (Array.isArray(value)) {
    const clone: unknown[] = [];
    visited.set(value as object, clone);
    for (const item of value) {
      clone.push(deepClone(item, visited));
    }
    return clone as unknown as T;
  }
  const clone = {} as Record<string, unknown>;
  visited.set(value as object, clone);
  for (const key of Object.keys(value as object)) {
    clone[key] = deepClone((value as Record<string, unknown>)[key], visited);
  }
  return clone as unknown as T;
}

export interface ValueObject<T> {
  equals(other: ValueObject<T>): boolean;
  value: T;
}

/**
 * Base class for Domain-Driven Design Value Objects.
 *
 * Value Objects are immutable domain primitives that are compared by value,
 * not by reference. They encapsulate validation and domain logic for
 * primitive concepts like Email, Money, Address, etc.
 *
 * **Key characteristics:**
 * - **Immutable**: Value cannot be changed after construction
 * - **Equality by value**: Two VOs with the same value are considered equal
 * - **Self-validating**: Validation runs in factory method before construction
 *
 * **Pattern:**
 * Subclasses validate in their static `create()` method BEFORE calling the
 * constructor. This ensures invalid objects never exist, even briefly.
 *
 * @typeParam T - The underlying value type
 *
 * @example
 * ```typescript
 * class Email extends BaseValueObject<string> {
 *   private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 *
 *   static create(value: Email['value']): Email {
 *     if (!Email.EMAIL_REGEX.test(value)) {
 *       throw new InvariantViolationError({
 *         message: 'Invalid email format',
 *         code: 'INVALID_EMAIL',
 *       });
 *     }
 *     return new Email(value);
 *   }
 * }
 *
 * const email1 = Email.create('user@example.com');
 * const email2 = Email.create('user@example.com');
 * email1.equals(email2); // true
 * ```
 */
export abstract class BaseValueObject<T> implements ValueObject<T> {
  private readonly _value: T;

  /**
   * Creates a new Value Object instance.
   * Protected to enforce factory pattern - use static create() method.
   *
   * @param value - The validated value to wrap
   */
  protected constructor(value: T) {
    this._value = value;
  }

  /**
   * Compares this Value Object with another for equality.
   *
   * Uses deep equality comparison to handle nested objects, arrays, and dates.
   * Two Value Objects are equal if their underlying values are deeply equal.
   * Passing `null` or `undefined` safely returns `false`.
   *
   * @param other - The Value Object to compare with
   * @returns `true` if the values are deeply equal, `false` otherwise
   */
  public equals(other: BaseValueObject<T>): boolean {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    return deepEquals(this._value, other._value);
  }

  /**
   * The underlying immutable value.
   *
   * For object and array values a deep clone is returned on every access to
   * prevent callers from mutating the stored state. For primitives and Dates
   * the value is returned directly (Dates are also cloned).
   *
   * **Performance note:** each access performs an O(n) clone of the stored
   * value where n is the size of the object graph. For hot paths consider
   * caching the result locally.
   *
   * @returns A deep clone of the wrapped value of type T
   */
  public get value(): T {
    return deepClone(this._value);
  }
}
