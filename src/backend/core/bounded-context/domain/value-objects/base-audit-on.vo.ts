import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import type { SkipValueObjectValidation } from '../classes/base-value-object.class';
import { BaseValueObject } from '../classes/base-value-object.class';
import { InvariantViolationError } from '../exceptions/invariant-violation.error';

export abstract class BaseAuditOnVo extends BaseValueObject<{
  createdAt: Date;
  updatedAt: Date;
}> {
  protected constructor(
    value: { createdAt: Date; updatedAt: Date },
    validator: BoundValidator<{ createdAt: Date; updatedAt: Date }> | SkipValueObjectValidation,
  ) {
    // Domain enforces its own invariant
    if (value.updatedAt < value.createdAt) {
      throw new InvariantViolationError({
        message: 'UpdatedAt cannot be earlier than createdAt',
        code: 'INVALID_AUDIT_TIMESTAMPS',
      });
    }
    super(value, validator);
  }

  abstract update(): BaseAuditOnVo;

  get createdAt(): Date {
    return new Date(this.value.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.value.updatedAt);
  }
}
