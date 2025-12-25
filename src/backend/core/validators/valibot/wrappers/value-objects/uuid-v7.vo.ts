import { pipe, string, uuid } from 'valibot';
import { BaseUuidV7Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v7.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = pipe(string(), uuid());

export class UuidV7Vo extends BaseUuidV7Vo {
  private constructor(value: string) {
    super(value, createValibotValidator(schema));
  }

  static override create(value: string): UuidV7Vo {
    return new UuidV7Vo(value);
  }
}
