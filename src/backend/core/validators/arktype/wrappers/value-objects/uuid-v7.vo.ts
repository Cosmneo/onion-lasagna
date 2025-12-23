import { type } from 'arktype';
import { BaseUuidV7Vo } from '../../../../bounded-context/domain/value-objects/base-uuid-v7.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = type('string.uuid.v7');

export class UuidV7Vo extends BaseUuidV7Vo {
  private constructor(value: string) {
    super(value, createArkTypeValidator(schema));
  }

  static override create(value: string): UuidV7Vo {
    return new UuidV7Vo(value);
  }
}
