import { type } from 'arktype';
import { BaseShortTextVo } from '../../../../bounded-context/domain/value-objects/base-short-text.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = (maxLength: number) => type(`1 <= string <= ${maxLength}`);

export class ShortTextVo extends BaseShortTextVo {
  private constructor(value: string, maxLength = 100) {
    super(value, createArkTypeValidator(schema(maxLength)));
  }

  static create(value: string, maxLength = 100): ShortTextVo {
    return new ShortTextVo(value, maxLength);
  }
}
