import { Type } from '@sinclair/typebox';
import { BaseMediumTextVo } from '../../../../bounded-context/domain/value-objects/base-medium-text.vo';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = (maxLen: number) => Type.String({ minLength: 1, maxLength: maxLen });

export class MediumTextVo extends BaseMediumTextVo {
  private constructor(value: string, maxLen = 500) {
    super(value, createTypeBoxValidator(schema(maxLen)));
  }

  static create(value: string, maxLen = 500): MediumTextVo {
    return new MediumTextVo(value, maxLen);
  }
}
