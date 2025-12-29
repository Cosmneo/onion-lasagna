import { type } from 'arktype';
import { BaseLongTextVo } from '../../../../onion-layers/domain/value-objects/base-long-text.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = (maxLength: number) => type(`1 <= string <= ${maxLength}`);

export class LongTextVo extends BaseLongTextVo {
  private constructor(value: string, max: number) {
    super(value, createArkTypeValidator(schema(max)));
  }

  static override create(value: string, maxLength: number = BaseLongTextVo.defaultMaxLength): LongTextVo {
    return new LongTextVo(value, maxLength);
  }
}
