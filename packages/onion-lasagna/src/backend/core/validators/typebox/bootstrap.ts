/**
 * TypeBox validator bootstrap module.
 *
 * Entry point for creating TypeBox-based validators compatible with
 * {@link BaseDto} and {@link BaseValueObject}. Provides both a
 * singleton instance and a factory function for convenience.
 *
 * @see {@link TypeBoxObjectValidator} for path normalization details.
 *
 * @example
 * ```typescript
 * import { createTypeBoxValidator } from '@cosmneo/onion-lasagna/backend/core/validators/typebox';
 * import { Type } from '@sinclair/typebox';
 *
 * const userSchema = Type.Object({
 *   name: Type.String({ minLength: 1 }),
 *   email: Type.String({ format: 'email' }),
 * });
 *
 * const validator = createTypeBoxValidator<{ name: string; email: string }>(userSchema);
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
import type { TSchema } from '@sinclair/typebox';
import { TypeBoxObjectValidator } from './object-validator.typebox';
import type { BoundValidator } from '../../global/interfaces/ports/object-validator.port';

/**
 * Singleton TypeBox validator instance.
 *
 * Use this directly when you need access to the underlying
 * {@link ObjectValidatorPort} implementation.
 */
export const typeBoxObjectValidator = new TypeBoxObjectValidator();

/**
 * Creates a bound validator from a TypeBox schema.
 *
 * @typeParam T - The validated output type (must be specified explicitly)
 * @param schema - A TypeBox TSchema defining the validation rules
 * @returns A {@link BoundValidator} ready for use with BaseDto or BaseValueObject
 *
 * @example
 * ```typescript
 * const emailValidator = createTypeBoxValidator<string>(Type.String({ format: 'email' }));
 * const validated = emailValidator.validate('user@example.com'); // Returns string
 * ```
 */
export const createTypeBoxValidator = <T>(schema: TSchema): BoundValidator<T> =>
  typeBoxObjectValidator.withSchema<T>(schema);
