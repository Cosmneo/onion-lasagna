import { Type } from '@sinclair/typebox';
import { BaseLongTextVo } from '../../../../onion-layers/domain/value-objects/base-long-text.vo';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = (max: number) => Type.String({ minLength: 1, maxLength: max });

export class LongTextVo extends BaseLongTextVo {
  private constructor(value: string, max: number) {
    super(value, createTypeBoxValidator<string>(schema(max)));
  }

  static create(value: string, maxLength: number = 2000): LongTextVo {
    return new LongTextVo(value, maxLength);
  }
}
