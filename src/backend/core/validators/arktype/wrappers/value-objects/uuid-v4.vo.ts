import { type } from 'arktype';
import { BaseUuidV4Vo } from '../../../../bounded-context/domain/value-objects/base-uuid-v4.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = type('string.uuid.v4');

export class UuidV4Vo extends BaseUuidV4Vo {
  private constructor(value: string) {
    super(value, createArkTypeValidator(schema));
  }

  static create(value: string): UuidV4Vo {
    return new UuidV4Vo(value);
  }
}
