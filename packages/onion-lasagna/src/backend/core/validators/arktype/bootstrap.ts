/**
 * ArkType validator bootstrap module.
 *
 * Entry point for creating ArkType-based validators compatible with
 * {@link BaseDto} and {@link BaseValueObject}. Provides both a
 * singleton instance and a factory function for convenience.
 *
 * @see {@link ArkTypeObjectValidator} for path normalization details.
 *
 * @example
 * ```typescript
 * import { createArkTypeValidator } from '@cosmneo/onion-lasagna/backend/core/validators/arktype';
 * import { type } from 'arktype';
 *
 * const userSchema = type({
 *   name: 'string>0',
 *   email: 'email',
 * });
 *
 * const validator = createArkTypeValidator(userSchema);
 *
 * // Use with BaseDto
 * class CreateUserDto extends BaseDto<{ name: string; email: string }> {
 *   static create(data: unknown) {
 *     return new CreateUserDto(data, validator);
 *   }
 * }
 * ```
 *
 * @module
 */
import { type Type } from 'arktype';
import { ArkTypeObjectValidator } from './object-validator.arktype';
import type { BoundValidator } from '../../global/interfaces/ports/object-validator.port';

/**
 * Singleton ArkType validator instance.
 *
 * Use this directly when you need access to the underlying
 * {@link ObjectValidatorPort} implementation.
 */
export const arkTypeObjectValidator = new ArkTypeObjectValidator();

/**
 * Creates a bound validator from an ArkType schema.
 *
 * @typeParam T - The validated output type inferred from the schema
 * @param schema - An ArkType Type defining the validation rules
 * @returns A {@link BoundValidator} ready for use with BaseDto or BaseValueObject
 *
 * @example
 * ```typescript
 * const emailValidator = createArkTypeValidator(type('email'));
 * const validated = emailValidator.validate('user@example.com'); // Returns string
 * ```
 */
export const createArkTypeValidator = <T>(schema: Type<T>): BoundValidator<T> =>
  arkTypeObjectValidator.withSchema<T>(schema);
