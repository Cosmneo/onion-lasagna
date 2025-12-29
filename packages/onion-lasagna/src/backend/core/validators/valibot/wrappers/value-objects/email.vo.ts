import { pipe, string, email } from 'valibot';
import { BaseEmailVo } from '../../../../onion-layers/domain/value-objects/base-email.vo';
import { createValibotValidator } from '../../bootstrap';

const schema = pipe(string(), email());

export class EmailVo extends BaseEmailVo {
  private constructor(value: string) {
    super(value, createValibotValidator(schema));
  }

  static override create(value: string): EmailVo {
    return new EmailVo(value);
  }
}
