import { Type } from '@sinclair/typebox';
import type { InferValue } from '../../../../onion-layers/domain/classes/base-value-object.class';
import { BaseUuidV7Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v7.vo';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = Type.String({ format: 'uuid' });
const validator = createTypeBoxValidator<InferValue<BaseUuidV7Vo>>(schema);

export class UuidV7Vo extends BaseUuidV7Vo {
    static override create(value: InferValue<BaseUuidV7Vo>): UuidV7Vo {
        return new UuidV7Vo(value, validator);
    }
}
