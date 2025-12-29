import { z } from 'zod';
import { BaseShortTextVo } from '../../../../onion-layers/domain/value-objects/base-short-text.vo';
import { createZodValidator } from '../../bootstrap';

const schema = (maxLength: number) => z.string().min(1).max(maxLength);

export class ShortTextVo extends BaseShortTextVo {
  private constructor(value: string, maxLength: number) {
    super(value, createZodValidator(schema(maxLength)));
  }

  static override create(value: string, maxLength: number = BaseShortTextVo.defaultMaxLength): ShortTextVo {
    return new ShortTextVo(value, maxLength);
  }
}
