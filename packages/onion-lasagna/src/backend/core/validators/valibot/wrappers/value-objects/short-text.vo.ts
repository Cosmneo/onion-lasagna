import { pipe, string, minLength, maxLength } from 'valibot';
import { BaseShortTextVo } from '../../../../onion-layers/domain/value-objects/base-short-text.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = (max: number) => pipe(string(), minLength(1), maxLength(max));

export class ShortTextVo extends BaseShortTextVo {
  private constructor(value: string, max: number) {
    super(value, createValibotValidator(schema(max)));
  }

  static override create(value: string, maxLength: number = BaseShortTextVo.defaultMaxLength): ShortTextVo {
    return new ShortTextVo(value, maxLength);
  }
}
