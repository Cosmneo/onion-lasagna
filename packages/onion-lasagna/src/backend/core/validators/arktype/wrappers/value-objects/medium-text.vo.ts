import { type } from 'arktype';
import { BaseMediumTextVo } from '../../../../onion-layers/domain/value-objects/base-medium-text.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = (maxLength: number) => type(`1 <= string <= ${maxLength}`);

export class MediumTextVo extends BaseMediumTextVo {
  private constructor(value: string, maxLength = 500) {
    super(value, createArkTypeValidator(schema(maxLength)));
  }

  static create(value: string, maxLength = 500): MediumTextVo {
    return new MediumTextVo(value, maxLength);
  }
}
