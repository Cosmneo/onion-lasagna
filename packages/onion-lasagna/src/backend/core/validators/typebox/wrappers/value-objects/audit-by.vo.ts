import { Type } from '@sinclair/typebox';
import { BaseAuditByVo } from '../../../../onion-layers/domain/value-objects/base-audit-by.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { createTypeBoxValidator } from '../../bootstrap';
import type { BaseUuidV4Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v4.vo';
import { UuidV4Vo } from './uuid-v4.vo';

const schema = Type.Object({
  createdBy: Type.Optional(Type.String({ format: 'uuid' })),
  updatedBy: Type.Optional(Type.String({ format: 'uuid' })),
});

export class AuditByVo extends BaseAuditByVo {
  private constructor(value: { createdBy?: BaseUuidV4Vo; updatedBy?: BaseUuidV4Vo }) {
    super(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static create({ createdBy, updatedBy }: { createdBy?: string; updatedBy?: string }): AuditByVo {
    const validated = createTypeBoxValidator<{
      createdBy?: string;
      updatedBy?: string;
    }>(schema).validate({
      createdBy,
      updatedBy,
    });

    return new AuditByVo({
      createdBy: validated.createdBy ? UuidV4Vo.create(validated.createdBy) : undefined,
      updatedBy: validated.updatedBy ? UuidV4Vo.create(validated.updatedBy) : undefined,
    });
  }

  override update(updatedBy: BaseUuidV4Vo): AuditByVo {
    return new AuditByVo({ createdBy: this.value.createdBy, updatedBy });
  }
}
