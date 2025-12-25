import { Type } from '@sinclair/typebox';
import { BaseAuditOnVo } from '../../../../onion-layers/domain/value-objects/base-audit-on.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = Type.Object({
  createdAt: Type.Optional(Type.Date()),
  updatedAt: Type.Optional(Type.Date()),
});

export class AuditOnVo extends BaseAuditOnVo {
  private constructor(value: { createdAt: Date; updatedAt: Date }) {
    super(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static create({ createdAt, updatedAt }: { createdAt?: Date; updatedAt?: Date }): AuditOnVo {
    const validated = createTypeBoxValidator<{
      createdAt?: Date;
      updatedAt?: Date;
    }>(schema).validate({
      createdAt,
      updatedAt,
    });

    const finalCreatedAt = validated.createdAt ?? new Date();
    const finalUpdatedAt = validated.updatedAt ?? finalCreatedAt;

    return new AuditOnVo({
      createdAt: new Date(finalCreatedAt),
      updatedAt: new Date(finalUpdatedAt),
    });
  }

  update(): AuditOnVo {
    return new AuditOnVo({ createdAt: this.createdAt, updatedAt: new Date() });
  }
}
