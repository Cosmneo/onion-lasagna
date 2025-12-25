import { pipe, string, minLength, maxLength } from 'valibot';
import { BaseMediumTextVo } from '../../../../onion-layers/domain/value-objects/base-medium-text.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = (maxLen: number) => pipe(string(), minLength(1), maxLength(maxLen));

export class MediumTextVo extends BaseMediumTextVo {
  private constructor(value: string, maxLen = 500) {
    super(value, createValibotValidator(schema(maxLen)));
  }

  static create(value: string, maxLen = 500): MediumTextVo {
    return new MediumTextVo(value, maxLen);
  }
}
