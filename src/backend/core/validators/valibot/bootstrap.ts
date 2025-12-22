import type { BaseSchema, BaseIssue } from 'valibot';
import { ValibotObjectValidator } from './object-validator.valibot';
import type { BoundValidator } from '../../global/interfaces/ports/object-validator.port';

export const valibotObjectValidator = new ValibotObjectValidator();

export const createValibotValidator = <T>(
  schema: BaseSchema<unknown, T, BaseIssue<unknown>>,
): BoundValidator<T> => valibotObjectValidator.withSchema<T>(schema);
