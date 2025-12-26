import { z } from 'zod';
import { BaseEmailVo } from '../../../../onion-layers/domain/value-objects/base-email.vo';
import { createZodValidator } from '../../bootstrap';

const schema = z.string().email();

export class EmailVo extends BaseEmailVo {
  private constructor(value: string) {
    super(value, createZodValidator(schema));
  }

  static create(value: string): EmailVo {
    return new EmailVo(value);
  }
}
