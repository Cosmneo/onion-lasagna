import { Type } from '@sinclair/typebox';
import { BaseShortTextVo } from '../../../../onion-layers/domain/value-objects/base-short-text.vo';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = (max: number) => Type.String({ minLength: 1, maxLength: max });

export class ShortTextVo extends BaseShortTextVo {
  private constructor(value: string, max: number) {
    super(value, createTypeBoxValidator<string>(schema(max)));
  }

  static override create(value: string, maxLength: number = BaseShortTextVo.defaultMaxLength): ShortTextVo {
    return new ShortTextVo(value, maxLength);
  }
}
