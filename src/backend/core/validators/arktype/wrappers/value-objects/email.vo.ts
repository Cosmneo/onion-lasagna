import { type } from 'arktype';
import { BaseEmailVo } from '../../../../bounded-context/domain/value-objects/base-email.vo';
import { createArkTypeValidator } from '../../bootstrap';

const schema = type('string.email');

export class EmailVo extends BaseEmailVo {
  private constructor(value: string) {
    super(value, createArkTypeValidator(schema));
  }

  static create(value: string): EmailVo {
    return new EmailVo(value);
  }
}
