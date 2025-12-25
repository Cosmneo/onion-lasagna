import { z } from 'zod';
import { BaseMediumTextVo } from '../../../../onion-layers/domain/value-objects/base-medium-text.vo';
import { createZodValidator } from '../../bootstrap';

const schema = (maxLength: number) => z.string().min(1).max(maxLength);

export class MediumTextVo extends BaseMediumTextVo {
  private constructor(value: string, maxLength = 500) {
    super(value, createZodValidator(schema(maxLength)));
  }

  static create(value: string, maxLength = 500): MediumTextVo {
    return new MediumTextVo(value, maxLength);
  }
}
