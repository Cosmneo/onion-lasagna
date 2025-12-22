import { object, pipe, string, uuid, date, optional } from 'valibot';
import { BaseAuditInfoVo } from '../../../../bounded-context/domain/value-objects/base-audit-info.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../bounded-context/domain/classes/base-value-object.class';
import { createValibotValidator } from '../../bootstrap';
import type { BaseAuditByVo } from '../../../../bounded-context/domain/value-objects/base-audit-by.vo';
import type { BaseAuditOnVo } from '../../../../bounded-context/domain/value-objects/base-audit-on.vo';
import type { BaseUuidV4Vo } from '../../../../bounded-context/domain/value-objects/base-uuid-v4.vo';
import { AuditByVo } from './audit-by.vo';
import { AuditOnVo } from './audit-on.vo';

const schema = object({
  createdBy: optional(pipe(string(), uuid())),
  createdAt: optional(date()),
  updatedBy: optional(pipe(string(), uuid())),
  updatedAt: optional(date()),
});

export class AuditInfoVo extends BaseAuditInfoVo {
  private constructor(value: { by: BaseAuditByVo; on: BaseAuditOnVo }) {
    super(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static create({
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
  }: {
    createdBy?: string;
    createdAt?: Date;
    updatedBy?: string;
    updatedAt?: Date;
  }): AuditInfoVo {
    const validated = createValibotValidator(schema).validate({
      createdBy,
      createdAt,
      updatedBy,
      updatedAt,
    });

    const by = AuditByVo.create({
      createdBy: validated.createdBy,
      updatedBy: validated.updatedBy,
    });
    const on = AuditOnVo.create({
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt,
    });

    return new AuditInfoVo({ by, on });
  }

  static createNew(createdBy?: string): AuditInfoVo {
    const by = AuditByVo.create({ createdBy });
    const on = AuditOnVo.create({});
    return new AuditInfoVo({ by, on });
  }

  update(updatedBy: BaseUuidV4Vo): AuditInfoVo {
    const by = this.value.by.update(updatedBy);
    const on = this.value.on.update();
    return new AuditInfoVo({ by, on });
  }
}
