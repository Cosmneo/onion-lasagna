import { z } from 'zod';
import { BaseLongTextVo } from '../../../../bounded-context/domain/value-objects/base-long-text.vo';
import { createZodValidator } from '../../bootstrap';

const schema = (maxLength: number) => z.string().min(1).max(maxLength);

export class LongTextVo extends BaseLongTextVo {
  private constructor(value: string, maxLength = 2000) {
    super(value, createZodValidator(schema(maxLength)));
  }

  static create(value: string, maxLength = 2000): LongTextVo {
    return new LongTextVo(value, maxLength);
  }
}
