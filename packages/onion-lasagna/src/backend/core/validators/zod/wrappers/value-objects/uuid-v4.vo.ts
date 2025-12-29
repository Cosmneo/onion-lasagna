import { z } from 'zod';
import type { InferValue } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { BaseUuidV4Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v4.vo';
import { createZodValidator } from '../../bootstrap';

const schema = z.uuidv4();
const validator = createZodValidator<InferValue<BaseUuidV4Vo>>(schema);

export class UuidV4Vo extends BaseUuidV4Vo {
    static override create(value: InferValue<BaseUuidV4Vo>): UuidV4Vo {
        return new UuidV4Vo(value, validator);
    }
}
