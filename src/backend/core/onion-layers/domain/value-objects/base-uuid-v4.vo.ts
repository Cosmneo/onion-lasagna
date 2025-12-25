/**
 * Base UUID v4 value object for random entity identifiers.
 *
 * UUID v4 is a randomly generated UUID, suitable for identifiers where
 * time-ordering is not required. For time-sortable IDs, use {@link BaseUuidV7Vo}.
 *
 * **Use Cases:**
 * - User IDs (for audit tracking)
 * - Session tokens
 * - Correlation IDs
 * - Any identifier where time-ordering doesn't matter
 *
 * @example Generating a new ID
 * ```typescript
 * const id = BaseUuidV4Vo.generate();
 * console.log(id.value); // e.g., "550e8400-e29b-41d4-a716-446655440000"
 * ```
 *
 * @example Extending for validation
 * ```typescript
 * class UserIdVo extends BaseUuidV4Vo {
 *   static create(value: string): UserIdVo {
 *     return new UserIdVo(value, uuidValidator);
 *   }
 *
 *   static generate(): UserIdVo {
 *     return new UserIdVo(v4(), SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 * }
 * ```
 */
import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';
import { v4 } from 'uuid';

/**
 * Value object for UUID v4 identifiers.
 *
 * Provides a `generate()` factory method that creates new random UUIDs.
 *
 * @extends BaseValueObject<string>
 */
export class BaseUuidV4Vo extends BaseValueObject<string> {
  /**
   * Creates a new BaseUuidV4Vo instance.
   *
   * @param value - The UUID v4 string value
   * @param validator - Bound validator or skip validation symbol
   */
  protected constructor(
    value: string,
    validator: BoundValidator<string> | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }

  /**
   * Generates a new UUID v4 value object.
   *
   * Creates a random UUID, skipping validation since the
   * `uuid` library guarantees format.
   *
   * @returns A new BaseUuidV4Vo with a freshly generated UUID
   */
  static generate(): BaseUuidV4Vo {
    return new this(v4(), SKIP_VALUE_OBJECT_VALIDATION);
  }

  /**
   * Creates a UUID v4 value object from an existing string.
   *
   * At the base level, this skips validation. Subclasses from validator
   * packages (zod, arktype, etc.) override this to add validation.
   *
   * @param value - The UUID v4 string value
   * @returns A new BaseUuidV4Vo with the provided value
   *
   * @example
   * ```typescript
   * class UserId extends BaseUuidV4Vo {}
   * const userId = UserId.create('550e8400-e29b-41d4-a716-446655440000');
   * ```
   */
  static create(value: string): BaseUuidV4Vo {
    return new this(value, SKIP_VALUE_OBJECT_VALIDATION);
  }
}
