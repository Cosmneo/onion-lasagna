import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';

export const SKIP_VALUE_OBJECT_VALIDATION = 'skip value object validation' as const;
export type SkipValueObjectValidation = typeof SKIP_VALUE_OBJECT_VALIDATION;

/**
 * Deep equality comparison for value objects.
 * Handles primitives, Dates, Arrays, and Objects.
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

export class BaseValueObject<T> {
  private readonly _value: T;

  protected constructor(
    value: T,
    validator: BoundValidator<T> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    this._value = validator === SKIP_VALUE_OBJECT_VALIDATION ? value : validator.validate(value);
  }

  public equals(other: BaseValueObject<T>): boolean {
    // Fast path: same reference
    if (this === other) return true;

    // Deep equality comparison
    return deepEquals(this.value, other.value);
  }

  public get value(): T {
    return this._value;
  }
}
