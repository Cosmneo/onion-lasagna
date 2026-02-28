/**
 * Deep equality comparison for value objects.
 * Handles primitives, Dates, Arrays, and nested Objects.
 * @internal
 */
function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEquals(item, b[index]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEquals(aObj[key], bObj[key]));
  }
  return false;
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
   *
   * @param other - The Value Object to compare with
   * @returns `true` if the values are deeply equal, `false` otherwise
   */
  public equals(other: BaseValueObject<T>): boolean {
    if (this === other) return true;
    return deepEquals(this._value, other.value);
  }

  /**
   * The underlying immutable value.
   *
   * @returns The wrapped value of type T
   */
  public get value(): T {
    return this._value;
  }
}
