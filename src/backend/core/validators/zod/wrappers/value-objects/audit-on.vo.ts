import { z } from 'zod';
import { BaseAuditOnVo } from '../../../../bounded-context/domain/value-objects/base-audit-on.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../bounded-context/domain/classes/base-value-object.class';
import { createZodValidator } from '../../bootstrap';

const schema = z.object({
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export class AuditOnVo extends BaseAuditOnVo {
  private constructor(value: { createdAt: Date; updatedAt: Date }) {
    super(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static create({ createdAt, updatedAt }: { createdAt?: Date; updatedAt?: Date }): AuditOnVo {
    const validated = createZodValidator(schema).validate({
      createdAt,
      updatedAt,
    });

    const finalCreatedAt = validated.createdAt ?? new Date();
    const finalUpdatedAt = validated.updatedAt ?? finalCreatedAt;

    if (finalUpdatedAt < finalCreatedAt) {
      throw new Error('UpdatedAt cannot be earlier than createdAt');
    }

    return new AuditOnVo({
      createdAt: new Date(finalCreatedAt),
      updatedAt: new Date(finalUpdatedAt),
    });
  }

  override update(): AuditOnVo {
    const now = new Date();
    if (now < this.createdAt) {
      throw new Error('UpdatedAt cannot be earlier than createdAt');
    }
    return new AuditOnVo({ createdAt: this.createdAt, updatedAt: now });
  }
}
