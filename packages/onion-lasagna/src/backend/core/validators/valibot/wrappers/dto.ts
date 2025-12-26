import type { BaseSchema, BaseIssue } from 'valibot';
import { BaseDto } from '../../../global/classes/base-dto.class';
import { createValibotValidator } from '../bootstrap';

export class Dto<T> extends BaseDto<T> {
  constructor(schema: BaseSchema<unknown, T, BaseIssue<unknown>>, value: T) {
    super(value, createValibotValidator(schema));
  }
}
