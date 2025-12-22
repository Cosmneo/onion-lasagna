import type { TSchema } from '@sinclair/typebox';
import { TypeBoxObjectValidator } from './object-validator.typebox';
import type { BoundValidator } from '../../global/interfaces/ports/object-validator.port';

export const typeBoxObjectValidator = new TypeBoxObjectValidator();

export const createTypeBoxValidator = <T>(schema: TSchema): BoundValidator<T> =>
  typeBoxObjectValidator.withSchema<T>(schema);
