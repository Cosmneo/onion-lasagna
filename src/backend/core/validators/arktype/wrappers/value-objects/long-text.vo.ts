import { type } from 'arktype';
import { BaseLongTextVo } from '../../../../bounded-context/domain/value-objects/base-long-text.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = (maxLength: number) => type(`1 <= string <= ${maxLength}`);

export class LongTextVo extends BaseLongTextVo {
  private constructor(value: string, maxLength = 2000) {
    super(value, createArkTypeValidator(schema(maxLength)));
  }

  static create(value: string, maxLength = 2000): LongTextVo {
    return new LongTextVo(value, maxLength);
  }
}
