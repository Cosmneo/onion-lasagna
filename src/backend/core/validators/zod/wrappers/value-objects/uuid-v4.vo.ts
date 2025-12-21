import { z } from 'zod';
import { BaseUuidV4Vo } from '../../../../bounded-context/domain/value-objects/base-uuid-v4.vo';
import { createZodValidator } from '../../bootstrap';

const schema = z.uuidv4();

export class UuidV4Vo extends BaseUuidV4Vo {
  private constructor(value: string) {
    super(value, createZodValidator(schema));
  }

  static create(value: string): UuidV4Vo {
    return new UuidV4Vo(value);
  }
}
