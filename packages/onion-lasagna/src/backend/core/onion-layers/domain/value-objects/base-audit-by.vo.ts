/**
 * Base audit user tracking value object.
 *
 * Tracks which user created and last updated an entity. User IDs are
 * optional to support system-initiated operations where no user context
 * is available.
 *
 * @example Extending for a validator-specific implementation
 * ```typescript
 * class AuditByVo extends BaseAuditByVo {
 *   static create(opts?: {
 *     createdBy?: UuidV4Vo;
 *     updatedBy?: UuidV4Vo;
 *   }): AuditByVo {
 *     return new AuditByVo({
 *       createdBy: opts?.createdBy,
 *       updatedBy: opts?.updatedBy ?? opts?.createdBy,
 *     }, SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 *
 *   update(updatedBy: UuidV4Vo): AuditByVo {
 *     return new AuditByVo({
 *       createdBy: this.createdBy,
 *       updatedBy,
 *     }, SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 * }
 * ```
 */
import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import type { SkipValueObjectValidation } from '../classes/base-value-object.class';
import { BaseValueObject } from '../classes/base-value-object.class';
import type { BaseUuidV4Vo } from './base-uuid-v4.vo';

/**
 * Abstract base class for audit user tracking value objects.
 *
 * @extends BaseValueObject
 */
export abstract class BaseAuditByVo extends BaseValueObject<{
  createdBy?: BaseUuidV4Vo;
  updatedBy?: BaseUuidV4Vo;
}> {
  /**
   * Creates a new BaseAuditByVo instance.
   *
   * @param value - The user tracking values
   * @param value.createdBy - User who created the entity (optional for system ops)
   * @param value.updatedBy - User who last updated the entity (optional)
   * @param validator - Bound validator or skip validation symbol
   */
  protected constructor(
    value: { createdBy?: BaseUuidV4Vo; updatedBy?: BaseUuidV4Vo },
    validator:
      | BoundValidator<{ createdBy?: BaseUuidV4Vo; updatedBy?: BaseUuidV4Vo }>
      | SkipValueObjectValidation,
  ) {
    super(value, validator);
  }

  /**
   * Creates a new audit user tracking with updated user ID.
   *
   * @param updatedBy - The user ID performing the update
   * @returns A new immutable audit user tracking instance
   */
  abstract update(updatedBy: BaseUuidV4Vo): BaseAuditByVo;

  /**
   * The user ID who created the entity.
   * Returns `undefined` for system-created entities.
   */
  get createdBy(): BaseUuidV4Vo | undefined {
    return this.value.createdBy;
  }

  /**
   * The user ID who last updated the entity.
   * Returns `undefined` for system-updated entities.
   */
  get updatedBy(): BaseUuidV4Vo | undefined {
    return this.value.updatedBy;
  }
}
