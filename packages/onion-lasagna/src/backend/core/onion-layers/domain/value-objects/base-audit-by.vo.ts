/**
 * Base audit user tracking value object.
 *
 * Tracks which user created and last updated an entity. User IDs are
 * optional to support system-initiated operations where no user context
 * is available.
 *
 * @example
 * ```typescript
 * const audit = BaseAuditByVo.create({
 *   createdBy: userId,
 * });
 *
 * // Later, when updating
 * const updated = audit.update(updaterId);
 * ```
 */
import { BaseValueObject } from '../classes/base-value-object.class';
import type { BaseUuidV4Vo } from './base-uuid-v4.vo';

/**
 * Value object for audit user tracking.
 *
 * @extends BaseValueObject
 */
export class BaseAuditByVo extends BaseValueObject<{
  createdBy?: BaseUuidV4Vo;
  updatedBy?: BaseUuidV4Vo;
}> {
  /**
   * Creates an audit user tracking value object.
   * @param value - The user tracking values
   * @param value.createdBy - User who created the entity (optional for system ops)
   * @param value.updatedBy - User who last updated the entity (defaults to createdBy)
   */
  static create(value: BaseAuditByVo['value']): BaseAuditByVo {
    return new BaseAuditByVo({
      createdBy: value.createdBy,
      updatedBy: value.updatedBy ?? value.createdBy,
    });
  }

  /** The user who created the entity. */
  get createdBy(): BaseUuidV4Vo | undefined {
    return this.value.createdBy;
  }

  /** The user who last updated the entity. */
  get updatedBy(): BaseUuidV4Vo | undefined {
    return this.value.updatedBy;
  }

  /**
   * Creates a new audit user tracking with updated user ID.
   *
   * @param updatedBy - The user ID performing the update
   * @returns A new immutable audit user tracking instance
   */
  update(updatedBy: BaseUuidV4Vo): BaseAuditByVo {
    return new BaseAuditByVo({
      createdBy: this.createdBy,
      updatedBy,
    });
  }
}
