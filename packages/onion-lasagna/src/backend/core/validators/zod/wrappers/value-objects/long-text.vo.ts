import { z } from 'zod';
import { BaseLongTextVo } from '../../../../onion-layers/domain/value-objects/base-long-text.vo';
import { createZodValidator } from '../../bootstrap';

const schema = (maxLength: number) => z.string().min(1).max(maxLength);

export class LongTextVo extends BaseLongTextVo {
  private constructor(value: string, maxLength: number) {
    super(value, createZodValidator(schema(maxLength)));
  }

  static create(value: string, maxLength: number = 2000): LongTextVo {
    return new LongTextVo(value, maxLength);
  }
}
