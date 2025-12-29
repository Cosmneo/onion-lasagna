import { Type } from '@sinclair/typebox';
import { BaseMediumTextVo } from '../../../../onion-layers/domain/value-objects/base-medium-text.vo';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = (max: number) => Type.String({ minLength: 1, maxLength: max });

export class MediumTextVo extends BaseMediumTextVo {
  private constructor(value: string, max: number) {
    super(value, createTypeBoxValidator<string>(schema(max)));
  }

  static override create(value: string, maxLength: number = BaseMediumTextVo.defaultMaxLength): MediumTextVo {
    return new MediumTextVo(value, maxLength);
  }
}
