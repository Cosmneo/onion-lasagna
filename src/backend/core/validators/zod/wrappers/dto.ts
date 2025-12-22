import type { z } from 'zod';
import { BaseDto } from '../../../global/classes/base-dto.class';
import { createZodValidator } from '../bootstrap';

export class Dto<T> extends BaseDto<T> {
  constructor(schema: z.ZodType<T>, value: T) {
    super(value, createZodValidator(schema));
  }
}
