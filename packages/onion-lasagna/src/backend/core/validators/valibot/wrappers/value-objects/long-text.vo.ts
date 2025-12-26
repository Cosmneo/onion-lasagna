import { pipe, string, minLength, maxLength } from 'valibot';
import { BaseLongTextVo } from '../../../../onion-layers/domain/value-objects/base-long-text.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = (maxLen: number) => pipe(string(), minLength(1), maxLength(maxLen));

export class LongTextVo extends BaseLongTextVo {
  private constructor(value: string, maxLen = 2000) {
    super(value, createValibotValidator(schema(maxLen)));
  }

  static create(value: string, maxLen = 2000): LongTextVo {
    return new LongTextVo(value, maxLen);
  }
}
