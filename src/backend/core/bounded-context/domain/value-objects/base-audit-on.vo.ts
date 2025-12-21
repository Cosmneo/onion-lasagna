import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';

export class BaseAuditOnVo extends BaseValueObject<{ createdAt: Date; updatedAt: Date }> {
  protected constructor(
    value: { createdAt: Date; updatedAt: Date },
    validator:
      | BoundValidator<{ createdAt: Date; updatedAt: Date }>
      | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }

  update(): BaseAuditOnVo {
    const now = new Date();
    if (now < this.value.createdAt) {
      throw new Error('UpdatedAt cannot be earlier than createdAt');
    }
    return new BaseAuditOnVo(
      { createdAt: this.value.createdAt, updatedAt: now },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }

  get createdAt(): Date {
    return new Date(this.value.createdAt);
  }

  get updatedAt(): Date {
    return new Date(this.value.updatedAt);
  }
}
