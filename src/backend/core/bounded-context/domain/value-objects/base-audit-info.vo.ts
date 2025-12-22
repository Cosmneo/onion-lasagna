import type { BoundValidator } from '../../../global/interfaces/ports/object-validator.port';
import type { SkipValueObjectValidation } from '../classes/base-value-object.class';
import { BaseValueObject } from '../classes/base-value-object.class';
import type { BaseAuditByVo } from './base-audit-by.vo';
import type { BaseAuditOnVo } from './base-audit-on.vo';
import type { BaseUuidV4Vo } from './base-uuid-v4.vo';

export abstract class BaseAuditInfoVo extends BaseValueObject<{
  by: BaseAuditByVo;
  on: BaseAuditOnVo;
}> {
  protected constructor(
    value: { by: BaseAuditByVo; on: BaseAuditOnVo },
    validator: BoundValidator<{ by: BaseAuditByVo; on: BaseAuditOnVo }> | SkipValueObjectValidation,
  ) {
    super(value, validator);
  }

  abstract update(updatedBy: BaseUuidV4Vo): BaseAuditInfoVo;

  get createdBy(): BaseUuidV4Vo | undefined {
    return this.value.by.createdBy;
  }

  get createdAt(): Date {
    return this.value.on.createdAt;
  }

  get updatedBy(): BaseUuidV4Vo | undefined {
    return this.value.by.updatedBy;
  }

  get updatedAt(): Date {
    return this.value.on.updatedAt;
  }

  get isModified(): boolean {
    return (
      this.updatedAt.getTime() !== this.createdAt.getTime() ||
      this.updatedBy?.value !== this.createdBy?.value
    );
  }

  get lastModifiedBy(): BaseUuidV4Vo | undefined {
    return this.updatedBy;
  }

  get lastModifiedAt(): Date {
    return this.updatedAt;
  }
}
