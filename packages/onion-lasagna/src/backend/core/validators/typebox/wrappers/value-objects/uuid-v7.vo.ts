import { Type } from '@sinclair/typebox';
import { BaseUuidV7Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v7.vo';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = Type.String({ format: 'uuid' });

export class UuidV7Vo extends BaseUuidV7Vo {
  private constructor(value: string) {
    super(value, createTypeBoxValidator(schema));
  }

  static override create(value: string): UuidV7Vo {
    return new UuidV7Vo(value);
  }
}
