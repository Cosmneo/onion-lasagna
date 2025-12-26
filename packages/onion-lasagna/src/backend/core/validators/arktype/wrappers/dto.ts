import { type Type } from 'arktype';
import { BaseDto } from '../../../global/classes/base-dto.class';
import { createArkTypeValidator } from '../bootstrap';

export class Dto<T> extends BaseDto<T> {
  constructor(schema: Type<T>, value: T) {
    super(value, createArkTypeValidator(schema));
  }
}
