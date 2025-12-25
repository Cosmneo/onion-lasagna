import { Type } from '@sinclair/typebox';
import { BaseAuditInfoVo } from '../../../../onion-layers/domain/value-objects/base-audit-info.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { createTypeBoxValidator } from '../../bootstrap';
import type { BaseAuditByVo } from '../../../../onion-layers/domain/value-objects/base-audit-by.vo';
import type { BaseAuditOnVo } from '../../../../onion-layers/domain/value-objects/base-audit-on.vo';
import type { BaseUuidV4Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v4.vo';
import { AuditByVo } from './audit-by.vo';
import { AuditOnVo } from './audit-on.vo';

const schema = Type.Object({
  createdBy: Type.Optional(Type.String({ format: 'uuid' })),
  createdAt: Type.Optional(Type.Date()),
  updatedBy: Type.Optional(Type.String({ format: 'uuid' })),
  updatedAt: Type.Optional(Type.Date()),
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
    const validated = createTypeBoxValidator<{
      createdBy?: string;
      createdAt?: Date;
      updatedBy?: string;
      updatedAt?: Date;
    }>(schema).validate({
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
