import { type Type } from 'arktype';
import { ArkTypeObjectValidator } from './object-validator.arktype';
import type { BoundValidator } from '../../global/interfaces/ports/object-validator.port';

export const arkTypeObjectValidator = new ArkTypeObjectValidator();

export const createArkTypeValidator = <T>(schema: Type<T>): BoundValidator<T> =>
  arkTypeObjectValidator.withSchema<T>(schema);
