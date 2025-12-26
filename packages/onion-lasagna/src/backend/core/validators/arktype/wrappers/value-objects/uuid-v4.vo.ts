import { type } from 'arktype';
import { BaseUuidV4Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v4.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = type('string.uuid.v4');

export class UuidV4Vo extends BaseUuidV4Vo {
  private constructor(value: string) {
    super(value, createArkTypeValidator(schema));
  }

  static override create(value: string): UuidV4Vo {
    return new UuidV4Vo(value);
  }
}
