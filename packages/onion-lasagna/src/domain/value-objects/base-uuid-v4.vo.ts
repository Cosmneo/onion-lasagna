/**
 * Base UUID v4 value object for random entity identifiers.
 *
 * UUID v4 is a randomly generated UUID, suitable for identifiers where
 * time-ordering is not required. For time-sortable IDs, use {@link BaseUuidV7Vo}.
 *
 * **Use Cases:**
 * - User IDs
 * - Session tokens
 * - Correlation IDs
 * - Any identifier where time-ordering doesn't matter
 *
 * @example
 * ```typescript
 * const id = BaseUuidV4Vo.generate();
 * const parsed = BaseUuidV4Vo.create('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
import { v4 } from 'uuid';
import { BaseValueObject } from '../classes/base-value-object.class';
import { InvariantViolationError } from '../exceptions/invariant-violation.error';

/**
 * Value object for UUID v4 identifiers.
 *
 * @extends BaseValueObject<string>
 */
export class BaseUuidV4Vo extends BaseValueObject<string> {
  private static readonly UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * Creates a UUID v4 value object from an existing UUID string.
   * @param value - The UUID string to validate and wrap
   * @throws {InvariantViolationError} When UUID format is invalid
   */
  static create(value: BaseUuidV4Vo['value']): BaseUuidV4Vo {
    if (!BaseUuidV4Vo.UUID_V4_REGEX.test(value)) {
      throw new InvariantViolationError({
        message: 'Invalid UUID v4 format',
        code: 'INVALID_UUID_V4',
      });
    }
    return new BaseUuidV4Vo(value);
  }

  /**
   * Generates a new UUID v4 value object.
   * No validation needed since uuid library guarantees valid output.
   */
  static generate(): BaseUuidV4Vo {
    return new BaseUuidV4Vo(v4());
  }
}
