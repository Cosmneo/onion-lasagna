import { pipe, string, minLength, maxLength } from 'valibot';
import { BaseMediumTextVo } from '../../../../onion-layers/domain/value-objects/base-medium-text.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = (max: number) => pipe(string(), minLength(1), maxLength(max));

export class MediumTextVo extends BaseMediumTextVo {
  private constructor(value: string, max: number) {
    super(value, createValibotValidator(schema(max)));
  }

  static create(value: string, maxLength: number = 500): MediumTextVo {
    return new MediumTextVo(value, maxLength);
  }
}
