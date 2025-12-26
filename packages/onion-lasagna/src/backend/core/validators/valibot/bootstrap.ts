/**
 * Valibot validator bootstrap module.
 *
 * Entry point for creating Valibot-based validators compatible with
 * {@link BaseDto} and {@link BaseValueObject}. Provides both a
 * singleton instance and a factory function for convenience.
 *
 * @see {@link ValibotObjectValidator} for path normalization details.
 *
 * @example
 * ```typescript
 * import { createValibotValidator } from '@cosmneo/onion-lasagna/backend/core/validators/valibot';
 * import * as v from 'valibot';
 *
 * const userSchema = v.object({
 *   name: v.pipe(v.string(), v.minLength(1)),
 *   email: v.pipe(v.string(), v.email()),
 * });
 *
 * const validator = createValibotValidator(userSchema);
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
import type { BaseSchema, BaseIssue } from 'valibot';
import { ValibotObjectValidator } from './object-validator.valibot';
import type { BoundValidator } from '../../global/interfaces/ports/object-validator.port';

/**
 * Singleton Valibot validator instance.
 *
 * Use this directly when you need access to the underlying
 * {@link ObjectValidatorPort} implementation.
 */
export const valibotObjectValidator = new ValibotObjectValidator();

/**
 * Creates a bound validator from a Valibot schema.
 *
 * @typeParam T - The validated output type inferred from the schema
 * @param schema - A Valibot BaseSchema defining the validation rules
 * @returns A {@link BoundValidator} ready for use with BaseDto or BaseValueObject
 *
 * @example
 * ```typescript
 * const emailValidator = createValibotValidator(v.pipe(v.string(), v.email()));
 * const validated = emailValidator.validate('user@example.com'); // Returns string
 * ```
 */
export const createValibotValidator = <T>(
  schema: BaseSchema<unknown, T, BaseIssue<unknown>>,
): BoundValidator<T> => valibotObjectValidator.withSchema<T>(schema);
