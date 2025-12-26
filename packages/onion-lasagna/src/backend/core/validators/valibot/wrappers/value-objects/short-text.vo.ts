import { pipe, string, minLength, maxLength } from 'valibot';
import { BaseShortTextVo } from '../../../../onion-layers/domain/value-objects/base-short-text.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = (maxLen: number) => pipe(string(), minLength(1), maxLength(maxLen));

export class ShortTextVo extends BaseShortTextVo {
  private constructor(value: string, maxLen = 100) {
    super(value, createValibotValidator(schema(maxLen)));
  }

  static create(value: string, maxLen = 100): ShortTextVo {
    return new ShortTextVo(value, maxLen);
  }
}
