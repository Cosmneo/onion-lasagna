import { type } from 'arktype';
import type { InferValue } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { BaseUuidV4Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v4.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = type('string.uuid.v4');
const validator = createArkTypeValidator<InferValue<BaseUuidV4Vo>>(schema);

export class UuidV4Vo extends BaseUuidV4Vo {
    static override create(value: InferValue<BaseUuidV4Vo>): UuidV4Vo {
        return new UuidV4Vo(value, validator);
    }
}
