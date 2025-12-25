import { Type } from '@sinclair/typebox';
import { BaseUuidV4Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v4.vo';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = Type.String({ format: 'uuid' });

export class UuidV4Vo extends BaseUuidV4Vo {
  private constructor(value: string) {
    super(value, createTypeBoxValidator(schema));
  }

  static override create(value: string): UuidV4Vo {
    return new UuidV4Vo(value);
  }
}
