/**
 * Base audit timestamp value object.
 *
 * Tracks when an entity was created and last updated. Enforces the
 * domain invariant that `updatedAt` cannot be earlier than `createdAt`.
 *
 * **Domain Invariant:**
 * Throws {@link InvariantViolationError} if `updatedAt < createdAt`.
 *
 * @example
 * ```typescript
 * // Create with current timestamp
 * const audit = BaseAuditOnVo.now();
 *
 * // Create with specific dates
 * const audit = BaseAuditOnVo.create({
 *   createdAt: new Date('2024-01-01'),
 *   updatedAt: new Date('2024-01-15'),
 * });
 *
 * // Update timestamp
 * const updated = audit.update();
 * ```
 */
import { BaseValueObject } from '../classes/base-value-object.class';
import { InvariantViolationError } from '../exceptions/invariant-violation.error';

/**
 * Value object for audit timestamps.
 *
 * @extends BaseValueObject
 * @throws {InvariantViolationError} When `updatedAt` is earlier than `createdAt`
 */
export class BaseAuditOnVo extends BaseValueObject<{
  createdAt: Date;
  updatedAt: Date;
}> {
  /**
   * Creates an audit timestamp value object.
   * @param value - The timestamp values
   * @param value.createdAt - When the entity was created
   * @param value.updatedAt - When the entity was last updated
   * @throws {InvariantViolationError} When `updatedAt < createdAt`
   */
  static create(value: BaseAuditOnVo['value']): BaseAuditOnVo {
    if (value.updatedAt < value.createdAt) {
      throw new InvariantViolationError({
        message: 'UpdatedAt cannot be earlier than createdAt',
        code: 'INVALID_AUDIT_TIMESTAMPS',
      });
    }
    return new BaseAuditOnVo(value);
  }

  /**
   * Creates an audit timestamp with current time for both fields.
   * Convenience factory for new entities.
   */
  static now(): BaseAuditOnVo {
    const now = new Date();
    return new BaseAuditOnVo({ createdAt: now, updatedAt: now });
  }

  /** When the entity was created. Returns a clone to prevent mutation. */
  get createdAt(): Date {
    return new Date(this.value.createdAt);
  }

  /** When the entity was last updated. Returns a clone to prevent mutation. */
  get updatedAt(): Date {
    return new Date(this.value.updatedAt);
  }

  /**
   * Creates a new audit timestamp with current time as updatedAt.
   *
   * @returns A new immutable audit timestamp instance
   */
  update(): BaseAuditOnVo {
    return new BaseAuditOnVo({
      createdAt: this.value.createdAt,
      updatedAt: new Date(),
    });
  }
}
