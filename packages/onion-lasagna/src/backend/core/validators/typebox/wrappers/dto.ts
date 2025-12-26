import type { TSchema } from '@sinclair/typebox';
import { BaseDto } from '../../../global/classes/base-dto.class';
import { createTypeBoxValidator } from '../bootstrap';

export class Dto<T> extends BaseDto<T> {
  constructor(schema: TSchema, value: T) {
    super(value, createTypeBoxValidator<T>(schema));
  }
}
