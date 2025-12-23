/**
 * Base audit info value object for entity tracking.
 *
 * Composite value object that combines timestamp tracking ({@link BaseAuditOnVo})
 * and user tracking ({@link BaseAuditByVo}) into a single immutable audit record.
 * Used for tracking entity creation and modification history.
 *
 * **Composition:**
 * - `on`: {@link BaseAuditOnVo} - timestamps (createdAt, updatedAt)
 * - `by`: {@link BaseAuditByVo} - user IDs (createdBy, updatedBy)
 *
 * **Immutability:**
 * Date getters return cloned Date objects to prevent external mutation.
 *
 * @example Extending for a validator-specific implementation
 * ```typescript
 * class AuditInfoVo extends BaseAuditInfoVo {
 *   static create(createdBy?: UuidV4Vo): AuditInfoVo {
 *     const now = new Date();
 *     return new AuditInfoVo({
 *       by: AuditByVo.create({ createdBy, updatedBy: createdBy }),
 *       on: AuditOnVo.create({ createdAt: now, updatedAt: now }),
 *     }, SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 *
 *   update(updatedBy: UuidV4Vo): AuditInfoVo {
 *     return new AuditInfoVo({
 *       by: this.value.by.update(updatedBy),
 *       on: this.value.on.update(),
 *     }, SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 * }
 * ```
 *
 * @example Using with an entity
 * ```typescript
 * class User {
 *   constructor(
 *     public readonly id: UuidV7Vo,
 *     public readonly name: string,
 *     public readonly audit: AuditInfoVo,
 *   ) {}
 *
 *   updateName(name: string, updatedBy: UuidV4Vo): User {
 *     return new User(this.id, name, this.audit.update(updatedBy));
 *   }
 * }
 * ```
 */
import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import type { SkipValueObjectValidation } from '../classes/base-value-object.class';
import { BaseValueObject } from '../classes/base-value-object.class';
import type { BaseAuditByVo } from './base-audit-by.vo';
import type { BaseAuditOnVo } from './base-audit-on.vo';
import type { BaseUuidV4Vo } from './base-uuid-v4.vo';

/**
 * Abstract base class for audit information value objects.
 *
 * Extend this class and implement the `update()` method with your
 * validator-specific child VOs.
 *
 * @extends BaseValueObject
 */
export abstract class BaseAuditInfoVo extends BaseValueObject<{
  by: BaseAuditByVo;
  on: BaseAuditOnVo;
}> {
  /**
   * Creates a new BaseAuditInfoVo instance.
   *
   * @param value - Composite value containing audit by and on VOs
   * @param value.by - User tracking value object
   * @param value.on - Timestamp tracking value object
   * @param validator - Bound validator or skip validation symbol
   */
  protected constructor(
    value: { by: BaseAuditByVo; on: BaseAuditOnVo },
    validator: BoundValidator<{ by: BaseAuditByVo; on: BaseAuditOnVo }> | SkipValueObjectValidation,
  ) {
    super(value, validator);
  }

  /**
   * Creates a new audit info with updated timestamp and user.
   *
   * @param updatedBy - The user ID performing the update
   * @returns A new immutable audit info instance
   */
  abstract update(updatedBy: BaseUuidV4Vo): BaseAuditInfoVo;

  /**
   * The user ID who created the entity.
   * Returns `undefined` for system-created entities.
   */
  get createdBy(): BaseUuidV4Vo | undefined {
    return this.value.by.createdBy;
  }

  /**
   * The timestamp when the entity was created.
   * Returns a cloned Date to prevent mutation.
   */
  get createdAt(): Date {
    return new Date(this.value.on.createdAt.getTime());
  }

  /**
   * The user ID who last updated the entity.
   * Returns `undefined` for system-updated entities.
   */
  get updatedBy(): BaseUuidV4Vo | undefined {
    return this.value.by.updatedBy;
  }

  /**
   * The timestamp when the entity was last updated.
   * Returns a cloned Date to prevent mutation.
   */
  get updatedAt(): Date {
    return new Date(this.value.on.updatedAt.getTime());
  }

  /**
   * Whether the entity has been modified since creation.
   * Compares both timestamps and user IDs.
   */
  get isModified(): boolean {
    return (
      this.updatedAt.getTime() !== this.createdAt.getTime() ||
      this.updatedBy?.value !== this.createdBy?.value
    );
  }

  /**
   * Alias for `updatedBy` for semantic clarity.
   */
  get lastModifiedBy(): BaseUuidV4Vo | undefined {
    return this.updatedBy;
  }

  /**
   * Alias for `updatedAt` for semantic clarity.
   */
  get lastModifiedAt(): Date {
    return this.updatedAt;
  }
}
