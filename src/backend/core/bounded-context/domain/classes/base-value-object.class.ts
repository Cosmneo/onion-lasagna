import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';

/**
 * Sentinel value to skip validation in Value Object constructors.
 *
 * Use this when creating a Value Object from already-validated data,
 * such as when reconstituting from a database or creating derived VOs.
 *
 * @example
 * ```typescript
 * // In a VO that wraps a validated value
 * class Email extends BaseValueObject<string> {
 *   private constructor(value: string, validator: BoundValidator<string> | SkipValueObjectValidation) {
 *     super(value, validator);
 *   }
 *
 *   // Public factory validates
 *   static create(value: string): Email {
 *     return new Email(value, emailValidator);
 *   }
 *
 *   // Internal factory skips validation (data already validated)
 *   static fromPersistence(value: string): Email {
 *     return new Email(value, SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 * }
 * ```
 */
export const SKIP_VALUE_OBJECT_VALIDATION = 'skip value object validation' as const;

/** Type for the skip validation sentinel. */
export type SkipValueObjectValidation = typeof SKIP_VALUE_OBJECT_VALIDATION;

/**
 * Deep equality comparison for value objects.
 * Handles primitives, Dates, Arrays, and nested Objects.
 * @internal
 */
function deepEquals(a: unknown, b: unknown): boolean {
  // Same reference or both primitives with same value
  if (a === b) return true;

  // Handle null/undefined
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEquals(item, b[index]));
  }

  // Handle Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEquals(aObj[key], bObj[key]));
  }

  // Different types or values
  return false;
}

/**
 * Base class for Domain-Driven Design Value Objects.
 *
 * Value Objects are immutable domain primitives that are compared by value,
 * not by reference. They encapsulate validation and domain logic for
 * primitive concepts like Email, Money, Address, etc.
 *
 * Key characteristics:
 * - **Immutable**: Value cannot be changed after construction
 * - **Equality by value**: Two VOs with the same value are considered equal
 * - **Self-validating**: Validation runs at construction time
 *
 * @typeParam T - The underlying value type
 *
 * @example
 * ```typescript
 * class Email extends BaseValueObject<string> {
 *   private constructor(value: string, validator: BoundValidator<string> | SkipValueObjectValidation) {
 *     super(value, validator);
 *   }
 *
 *   static create(value: string): Email {
 *     return new Email(value, emailValidator);
 *   }
 *
 *   get domain(): string {
 *     return this.value.split('@')[1];
 *   }
 * }
 *
 * const email1 = Email.create('user@example.com');
 * const email2 = Email.create('user@example.com');
 * email1.equals(email2); // true
 * ```
 */
export class BaseValueObject<T> {
  private readonly _value: T;

  /**
   * Creates a new Value Object instance.
   *
   * @param value - The raw value to wrap
   * @param validator - A bound validator or SKIP_VALUE_OBJECT_VALIDATION to bypass
   * @throws {ObjectValidationError} When validation fails
   */
  protected constructor(
    value: T,
    validator: BoundValidator<T> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    this._value = validator === SKIP_VALUE_OBJECT_VALIDATION ? value : validator.validate(value);
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
    // Fast path: same reference
    if (this === other) return true;

    // Deep equality comparison
    return deepEquals(this.value, other.value);
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
