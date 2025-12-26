import { Type } from '@sinclair/typebox';
import { BaseLongTextVo } from '../../../../onion-layers/domain/value-objects/base-long-text.vo';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = (maxLen: number) => Type.String({ minLength: 1, maxLength: maxLen });

export class LongTextVo extends BaseLongTextVo {
  private constructor(value: string, maxLen = 2000) {
    super(value, createTypeBoxValidator(schema(maxLen)));
  }

  static create(value: string, maxLen = 2000): LongTextVo {
    return new LongTextVo(value, maxLen);
  }
}
