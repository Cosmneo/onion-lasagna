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
 * Interface for Value Object instances.
 *
 * Defines the contract that all Value Objects must satisfy:
 * - Immutable value access via `value` getter
 * - Value-based equality via `equals()` method
 *
 * @typeParam T - The underlying value type
 */
export interface ValueObject<T> {
    readonly value: T;
    equals(other: ValueObject<T>): boolean;
}

/**
 * Extracts the underlying value type from a Value Object class.
 *
 * Use this to derive types from base VOs, ensuring type safety
 * and automatic updates when the base type changes.
 *
 * @example
 * ```typescript
 * type Value = InferValue<BaseUuidV7Vo>; // string
 *
 * const validator = createZodValidator<Value>(schema);
 *
 * static override create(value: Value): UuidV7Vo {
 *   return new UuidV7Vo(value, validator);
 * }
 * ```
 */
export type InferValue<T extends BaseValueObject<unknown>> = T extends BaseValueObject<infer V>
    ? V
    : never;

/**
 * Generic interface for Value Object classes (static side).
 *
 * Use this to type constructor parameters when injecting VO classes
 * for dependency injection and polymorphism.
 *
 * @example
 * ```typescript
 * class MyUseCase {
 *   constructor(private readonly UuidV7Vo: VoClass<BaseUuidV7Vo>) {}
 *
 *   execute(input: { id: string }) {
 *     const vo = this.UuidV7Vo.create(input.id);
 *     return vo;
 *   }
 * }
 *
 * // Inject any compatible class
 * const useCase = new MyUseCase(UuidV7Vo);
 * ```
 */
export interface VoClass<T extends BaseValueObject<unknown>> {
    create(value: InferValue<T>): T;
}

// =============================================================================
// Static Method Validation Helper
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyValueObject = BaseValueObject<any>;

/**
 * Validates that a class implements required static methods.
 * Use at DI boundary to catch missing implementations at startup.
 *
 * @example
 * ```typescript
 * const myUseCase = new MyUseCase(
 *   assertStaticMethods<VoClass<EmailVo>>(EmailVo)
 * );
 *
 * // With custom methods for extended interfaces
 * interface EmailVoClass extends VoClass<EmailVo> {
 *   fromUser(username: string, domain: string): EmailVo;
 * }
 * const emailUseCase = new EmailUseCase(
 *   assertStaticMethods<EmailVoClass>(EmailVo, ['create', 'fromUser'])
 * );
 * ```
 */
export function assertStaticMethods<TStatic extends VoClass<AnyValueObject>>(
    VoClass: unknown,
    methods: string[] = ['create'],
): TStatic {
    const name = (VoClass as { name?: string })?.name ?? 'Unknown';
    for (const method of methods) {
        if (typeof (VoClass as Record<string, unknown>)[method] !== 'function') {
            throw new Error(`${name} must implement static ${method}()`);
        }
    }
    return VoClass as TStatic;
}

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
export class BaseValueObject<T> implements ValueObject<T> {
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
    public equals(other: ValueObject<T>): boolean {
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
