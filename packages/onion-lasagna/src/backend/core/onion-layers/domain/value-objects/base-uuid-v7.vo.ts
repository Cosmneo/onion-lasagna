/**
 * Base UUID v7 value object for time-sortable entity identifiers.
 *
 * UUID v7 is a time-ordered UUID that combines a Unix timestamp with
 * random bits, making it ideal for database primary keys because:
 *
 * **Benefits:**
 * - **Time-sortable**: IDs created later sort after earlier ones
 * - **Database-friendly**: Sequential nature reduces B-tree fragmentation
 * - **Globally unique**: Same uniqueness guarantees as other UUID versions
 * - **Timestamp extractable**: Creation time can be derived from the ID
 *
 * @example Generating a new ID
 * ```typescript
 * const id = BaseUuidV7Vo.generate();
 * console.log(id.value); // e.g., "018f3b1c-5e7d-7000-8000-000000000001"
 * ```
 *
 * @example Extending for validation
 * ```typescript
 * class EntityIdVo extends BaseUuidV7Vo {
 *   static create(value: string): EntityIdVo {
 *     return new EntityIdVo(value, uuidValidator);
 *   }
 *
 *   static generate(): EntityIdVo {
 *     return new EntityIdVo(v7(), SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 * }
 * ```
 *
 * @example Using as entity primary key
 * ```typescript
 * class User {
 *   constructor(
 *     public readonly id: EntityIdVo,
 *     public readonly name: string,
 *   ) {}
 *
 *   static create(name: string): User {
 *     return new User(EntityIdVo.generate(), name);
 *   }
 * }
 * ```
 */
import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';
import { v7 } from 'uuid';

/**
 * Value object for UUID v7 identifiers.
 *
 * Provides a `generate()` factory method that creates new time-ordered UUIDs.
 *
 * @extends BaseValueObject<string>
 */
export class BaseUuidV7Vo extends BaseValueObject<string> {
  /**
   * Creates a new BaseUuidV7Vo instance.
   *
   * @param value - The UUID v7 string value
   * @param validator - Bound validator or skip validation symbol
   */
  protected constructor(
    value: string,
    validator: BoundValidator<string> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }

  /**
   * Generates a new UUID v7 value object.
   *
   * Creates a time-ordered UUID using the current timestamp,
   * skipping validation since the `uuid` library guarantees format.
   *
   * @returns A new BaseUuidV7Vo with a freshly generated UUID
   */
  static generate(): BaseUuidV7Vo {
    return new this(v7(), SKIP_VALUE_OBJECT_VALIDATION);
  }

  /**
   * Creates a UUID v7 value object from an existing string.
   *
   * **Important:** This base implementation skips validation and accepts
   * any string value. Subclasses should override this method with a
   * validator to ensure UUID format correctness.
   *
   * @param value - The UUID v7 string value (not validated at base level)
   * @returns A new BaseUuidV7Vo with the provided value
   *
   * @example Subclass with validation (recommended)
   * ```typescript
   * class OrderId extends BaseUuidV7Vo {
   *   static override create(value: string): OrderId {
   *     return new OrderId(value, uuidV7Validator);
   *   }
   * }
   * ```
   *
   * @see generate - For creating new UUIDs (always valid)
   */
  static create(value: string): BaseUuidV7Vo {
    return new this(value, SKIP_VALUE_OBJECT_VALIDATION);
  }
}
