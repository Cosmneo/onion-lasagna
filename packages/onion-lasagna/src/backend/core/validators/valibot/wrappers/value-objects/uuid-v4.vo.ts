import { pipe, string, uuid } from 'valibot';
import type { InferValue } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { BaseUuidV4Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v4.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = pipe(string(), uuid());
const validator = createValibotValidator<InferValue<BaseUuidV4Vo>>(schema);

export class UuidV4Vo extends BaseUuidV4Vo {
    static override create(value: InferValue<BaseUuidV4Vo>): UuidV4Vo {
        return new UuidV4Vo(value, validator);
    }
}
