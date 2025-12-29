import { pipe, string, minLength, maxLength } from 'valibot';
import { BaseLongTextVo } from '../../../../onion-layers/domain/value-objects/base-long-text.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = (max: number) => pipe(string(), minLength(1), maxLength(max));

export class LongTextVo extends BaseLongTextVo {
  private constructor(value: string, max: number) {
    super(value, createValibotValidator(schema(max)));
  }

  static override create(value: string, maxLength: number = BaseLongTextVo.defaultMaxLength): LongTextVo {
    return new LongTextVo(value, maxLength);
  }
}
