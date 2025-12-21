import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import { BaseValueObject, SKIP_VALUE_OBJECT_VALIDATION } from '../classes/base-value-object.class';
import type { BaseUuidV4Vo } from './base-uuid-v4.vo';

export class BaseAuditByVo extends BaseValueObject<{
  createdBy?: BaseUuidV4Vo;
  updatedBy?: BaseUuidV4Vo;
}> {
  protected constructor(
    value: { createdBy?: BaseUuidV4Vo; updatedBy?: BaseUuidV4Vo },
    validator:
      | BoundValidator<{ createdBy?: BaseUuidV4Vo; updatedBy?: BaseUuidV4Vo }>
      | typeof SKIP_VALUE_OBJECT_VALIDATION,
  ) {
    super(value, validator);
  }

  update(updatedBy: BaseUuidV4Vo): BaseAuditByVo {
    return new BaseAuditByVo(
      { createdBy: this.value.createdBy, updatedBy },
      SKIP_VALUE_OBJECT_VALIDATION,
    );
  }

  get createdBy(): BaseUuidV4Vo | undefined {
    return this.value.createdBy;
  }

  get updatedBy(): BaseUuidV4Vo | undefined {
    return this.value.updatedBy;
  }
}
