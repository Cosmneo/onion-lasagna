import { z } from 'zod';
import { BaseShortTextVo } from '../../../../bounded-context/domain/value-objects/base-short-text.vo';
import { createZodValidator } from '../../bootstrap';

const schema = (maxLength: number) => z.string().min(1).max(maxLength);

export class ShortTextVo extends BaseShortTextVo {
  private constructor(value: string, maxLength = 100) {
    super(value, createZodValidator(schema(maxLength)));
  }

  static create(value: string, maxLength = 100): ShortTextVo {
    return new ShortTextVo(value, maxLength);
  }
}
