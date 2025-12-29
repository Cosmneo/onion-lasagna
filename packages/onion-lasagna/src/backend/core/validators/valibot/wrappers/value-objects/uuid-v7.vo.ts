import { pipe, string, uuid } from 'valibot';
import type { InferValue } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { BaseUuidV7Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v7.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = pipe(string(), uuid());
const validator = createValibotValidator<InferValue<BaseUuidV7Vo>>(schema);

export class UuidV7Vo extends BaseUuidV7Vo {
    static override create(value: InferValue<BaseUuidV7Vo>): UuidV7Vo {
        return new UuidV7Vo(value, validator);
    }
}
