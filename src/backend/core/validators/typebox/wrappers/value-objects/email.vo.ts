import { Type } from '@sinclair/typebox';
import { BaseEmailVo } from '../../../../bounded-context/domain/value-objects/base-email.vo';
import { createTypeBoxValidator } from '../../bootstrap';

const schema = Type.String({ format: 'email' });

export class EmailVo extends BaseEmailVo {
  private constructor(value: string) {
    super(value, createTypeBoxValidator(schema));
  }

  static create(value: string): EmailVo {
    return new EmailVo(value);
  }
}
