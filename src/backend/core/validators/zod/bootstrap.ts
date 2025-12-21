import type { z } from 'zod';
import { ZodObjectValidator } from './object-validator.zod';
import type { BoundValidator } from '../../global/interfaces/ports/object-validator.port';

export const zodObjectValidator = new ZodObjectValidator();

export const createZodValidator = <T>(schema: z.ZodType<T>): BoundValidator<T> =>
  zodObjectValidator.withSchema<T>(schema);
