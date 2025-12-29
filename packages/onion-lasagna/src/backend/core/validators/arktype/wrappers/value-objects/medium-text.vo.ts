import { type } from 'arktype';
import { BaseMediumTextVo } from '../../../../onion-layers/domain/value-objects/base-medium-text.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = (maxLength: number) => type(`1 <= string <= ${maxLength}`);

export class MediumTextVo extends BaseMediumTextVo {
  private constructor(value: string, max: number) {
    super(value, createArkTypeValidator(schema(max)));
  }

  static override create(value: string, maxLength: number = BaseMediumTextVo.defaultMaxLength): MediumTextVo {
    return new MediumTextVo(value, maxLength);
  }
}
