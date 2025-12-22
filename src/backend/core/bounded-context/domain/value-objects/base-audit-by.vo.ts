import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import type { SkipValueObjectValidation } from '../classes/base-value-object.class';
import { BaseValueObject } from '../classes/base-value-object.class';
import type { BaseUuidV4Vo } from './base-uuid-v4.vo';

export abstract class BaseAuditByVo extends BaseValueObject<{
  createdBy?: BaseUuidV4Vo;
  updatedBy?: BaseUuidV4Vo;
}> {
  protected constructor(
    value: { createdBy?: BaseUuidV4Vo; updatedBy?: BaseUuidV4Vo },
    validator:
      | BoundValidator<{ createdBy?: BaseUuidV4Vo; updatedBy?: BaseUuidV4Vo }>
      | SkipValueObjectValidation,
  ) {
    super(value, validator);
  }

  abstract update(updatedBy: BaseUuidV4Vo): BaseAuditByVo;

  get createdBy(): BaseUuidV4Vo | undefined {
    return this.value.createdBy;
  }

  get updatedBy(): BaseUuidV4Vo | undefined {
    return this.value.updatedBy;
  }
}
