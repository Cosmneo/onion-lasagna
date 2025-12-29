/**
 * Base audit timestamp value object.
 *
 * Tracks when an entity was created and last updated. Enforces the
 * domain invariant that `updatedAt` cannot be earlier than `createdAt`.
 *
 * **Domain Invariant:**
 * The constructor throws {@link InvariantViolationError} if
 * `updatedAt < createdAt`, ensuring timestamps are always valid.
 *
 * **Immutability:**
 * Date getters return cloned Date objects to prevent external mutation.
 *
 * @example Extending for a validator-specific implementation
 * ```typescript
 * class AuditOnVo extends BaseAuditOnVo {
 *   static create(opts?: { createdAt?: Date; updatedAt?: Date }): AuditOnVo {
 *     const now = new Date();
 *     return new AuditOnVo({
 *       createdAt: opts?.createdAt ?? now,
 *       updatedAt: opts?.updatedAt ?? now,
 *     }, SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 *
 *   update(): AuditOnVo {
 *     return new AuditOnVo({
 *       createdAt: this.createdAt,
 *       updatedAt: new Date(),
 *     }, SKIP_VALUE_OBJECT_VALIDATION);
 *   }
 * }
 * ```
 */
import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import {
    BaseValueObject,
    type SkipValueObjectValidation,
    type VoClass,
} from '../classes/base-value-object.class';
import { InvariantViolationError } from '../exceptions/invariant-violation.error';

/** Static interface for BaseAuditOnVo factory. */
export type BaseAuditOnVoStatic = VoClass<BaseAuditOnVo>;

/**
 * Abstract base class for audit timestamp value objects.
 *
 * @extends BaseValueObject
 * @throws {InvariantViolationError} When `updatedAt` is earlier than `createdAt`
 */
export abstract class BaseAuditOnVo extends BaseValueObject<{
    createdAt: Date;
    updatedAt: Date;
}> {
    /**
     * Creates a new BaseAuditOnVo instance.
     *
     * @param value - The timestamp values
     * @param value.createdAt - When the entity was created
     * @param value.updatedAt - When the entity was last updated
     * @param validator - Bound validator or skip validation symbol
     * @throws {InvariantViolationError} When `updatedAt < createdAt`
     */
    protected constructor(
        value: { createdAt: Date; updatedAt: Date },
        validator: BoundValidator<{ createdAt: Date; updatedAt: Date }> | SkipValueObjectValidation,
    ) {
        if (value.updatedAt < value.createdAt) {
            throw new InvariantViolationError({
                message: 'UpdatedAt cannot be earlier than createdAt',
                code: 'INVALID_AUDIT_TIMESTAMPS',
            });
        }
        super(value, validator);
    }

    /**
     * Creates a new audit timestamp with current time as updatedAt.
     *
     * @returns A new immutable audit timestamp instance
     */
    abstract update(): BaseAuditOnVo;
}
