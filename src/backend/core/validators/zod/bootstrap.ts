/**
 * Zod validator bootstrap module.
 *
 * Entry point for creating Zod-based validators compatible with
 * {@link BaseDto} and {@link BaseValueObject}. Provides both a
 * singleton instance and a factory function for convenience.
 *
 * @see {@link ZodObjectValidator} for path normalization details.
 *
 * @example
 * ```typescript
 * import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
 * import { z } from 'zod';
 *
 * const userSchema = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * });
 *
 * const validator = createZodValidator(userSchema);
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
import type { z } from 'zod';
import { ZodObjectValidator } from './object-validator.zod';
import type { BoundValidator } from '../../global/interfaces/ports/object-validator.port';

/**
 * Singleton Zod validator instance.
 *
 * Use this directly when you need access to the underlying
 * {@link ObjectValidatorPort} implementation.
 */
export const zodObjectValidator = new ZodObjectValidator();

/**
 * Creates a bound validator from a Zod schema.
 *
 * @typeParam T - The validated output type inferred from the schema
 * @param schema - A Zod schema defining the validation rules
 * @returns A {@link BoundValidator} ready for use with BaseDto or BaseValueObject
 *
 * @example
 * ```typescript
 * const emailValidator = createZodValidator(z.string().email());
 * const validated = emailValidator.validate('user@example.com'); // Returns string
 * ```
 */
export const createZodValidator = <T>(schema: z.ZodType<T>): BoundValidator<T> =>
  zodObjectValidator.withSchema<T>(schema);
