import { type } from 'arktype';
import { BaseShortTextVo } from '../../../../onion-layers/domain/value-objects/base-short-text.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = (maxLength: number) => type(`1 <= string <= ${maxLength}`);

export class ShortTextVo extends BaseShortTextVo {
  private constructor(value: string, max: number) {
    super(value, createArkTypeValidator(schema(max)));
  }

  static override create(value: string, maxLength: number = BaseShortTextVo.defaultMaxLength): ShortTextVo {
    return new ShortTextVo(value, maxLength);
  }
}
