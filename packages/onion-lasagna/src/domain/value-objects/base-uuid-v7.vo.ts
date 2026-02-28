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
 * @example
 * ```typescript
 * const id = BaseUuidV7Vo.generate();
 * const parsed = BaseUuidV7Vo.create('018f3b1c-5e7d-7000-8000-000000000001');
 * ```
 */
import { v7 } from 'uuid';
import { BaseValueObject } from '../classes/base-value-object.class';
import { InvariantViolationError } from '../exceptions/invariant-violation.error';

/**
 * Value object for UUID v7 identifiers.
 *
 * @extends BaseValueObject<string>
 */
export class BaseUuidV7Vo extends BaseValueObject<string> {
  private static readonly UUID_V7_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * Creates a UUID v7 value object from an existing UUID string.
   * @param value - The UUID string to validate and wrap
   * @throws {InvariantViolationError} When UUID format is invalid
   */
  static create(value: BaseUuidV7Vo['value']): BaseUuidV7Vo {
    if (!BaseUuidV7Vo.UUID_V7_REGEX.test(value)) {
      throw new InvariantViolationError({
        message: 'Invalid UUID v7 format',
        code: 'INVALID_UUID_V7',
      });
    }
    return new BaseUuidV7Vo(value);
  }

  /**
   * Generates a new UUID v7 value object.
   * No validation needed since uuid library guarantees valid output.
   */
  static generate(): BaseUuidV7Vo {
    return new BaseUuidV7Vo(v7());
  }
}
