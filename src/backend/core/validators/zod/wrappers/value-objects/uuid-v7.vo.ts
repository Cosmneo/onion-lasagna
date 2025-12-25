import { z } from 'zod';
import { BaseUuidV7Vo } from '../../../../onion-layers/domain/value-objects/base-uuid-v7.vo';
import { createZodValidator } from '../../bootstrap';

const schema = z.uuidv7();

export class UuidV7Vo extends BaseUuidV7Vo {
  private constructor(value: string) {
    super(value, createZodValidator(schema));
  }

  static override create(value: string): UuidV7Vo {
    return new UuidV7Vo(value);
  }
}
