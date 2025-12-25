import { pipe, string, uuid } from 'valibot';
import { BaseUuidV4Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v4.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = pipe(string(), uuid());

export class UuidV4Vo extends BaseUuidV4Vo {
  private constructor(value: string) {
    super(value, createValibotValidator(schema));
  }

  static override create(value: string): UuidV4Vo {
    return new UuidV4Vo(value);
  }
}
