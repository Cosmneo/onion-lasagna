import { z } from 'zod';
import { BaseAuditByVo } from '../../../../onion-layers/domain/value-objects/base-audit-by.vo';
import { SKIP_VALUE_OBJECT_VALIDATION } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { createZodValidator } from '../../bootstrap';
import type { BaseUuidV4Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v4.vo';
import { UuidV4Vo } from './uuid-v4.vo';

const schema = z.object({
  createdBy: z.uuidv4().optional(),
  updatedBy: z.uuidv4().optional(),
});

export class AuditByVo extends BaseAuditByVo {
  private constructor(value: { createdBy?: BaseUuidV4Vo; updatedBy?: BaseUuidV4Vo }) {
    super(value, SKIP_VALUE_OBJECT_VALIDATION);
  }

  static create({ createdBy, updatedBy }: { createdBy?: string; updatedBy?: string }): AuditByVo {
    const validated = createZodValidator(schema).validate({
      createdBy,
      updatedBy,
    });

    return new AuditByVo({
      createdBy: validated.createdBy ? UuidV4Vo.create(validated.createdBy) : undefined,
      updatedBy: validated.updatedBy ? UuidV4Vo.create(validated.updatedBy) : undefined,
    });
  }

  update(updatedBy: BaseUuidV4Vo): AuditByVo {
    return new AuditByVo({ createdBy: this.createdBy, updatedBy });
  }
}
