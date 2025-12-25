import { Type } from '@sinclair/typebox';
import { BaseShortTextVo } from '../../../../onion-layers/domain/value-objects/base-short-text.vo';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = (maxLen: number) => Type.String({ minLength: 1, maxLength: maxLen });

export class ShortTextVo extends BaseShortTextVo {
  private constructor(value: string, maxLen = 100) {
    super(value, createTypeBoxValidator(schema(maxLen)));
  }

  static create(value: string, maxLen = 100): ShortTextVo {
    return new ShortTextVo(value, maxLen);
  }
}
