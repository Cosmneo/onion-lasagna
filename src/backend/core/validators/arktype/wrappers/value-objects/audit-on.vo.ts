import { type } from 'arktype';
import { BaseAuditOnVo } from '../../../../onion-layers/domain/value-objects/base-audit-on.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { createArkTypeValidator } from '../../bootstrap';

const schema = type({
  'createdAt?': 'Date',
  'updatedAt?': 'Date',
});

export class AuditOnVo extends BaseAuditOnVo {
  private constructor(value: { createdAt: Date; updatedAt: Date }) {
    super(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static create({ createdAt, updatedAt }: { createdAt?: Date; updatedAt?: Date }): AuditOnVo {
    const validated = createArkTypeValidator(schema).validate({
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
