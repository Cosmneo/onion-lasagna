/**
 * Zod implementation of the ObjectValidatorPort.
 *
 * Adapts Zod's validation API to the framework's validator abstraction,
 * converting Zod errors to {@link ObjectValidationError} with normalized paths.
 *
 * **Path Format (By Design):**
 * Each validation library reports error paths differently. The internal
 * `formatPath` function normalizes Zod's path array to a consistent format:
 * - Object fields: `user.email`
 * - Array indices: `items[0].name`
 * - Root-level: `root`
 *
 * @example Direct usage
 * ```typescript
 * const validator = new ZodObjectValidator();
 * const result = validator.validateObject(z.string().email(), 'test@example.com');
 * ```
 *
 * @example With bootstrap (recommended)
 * ```typescript
 * import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
 * const emailValidator = createZodValidator(z.string().email());
 * ```
 *
 * @module
 */
import type { z } from 'zod';
import type {
  BoundValidator,
  ObjectValidatorPort,
} from '../../global/interfaces/ports/object-validator.port';
import { ObjectValidationError } from '../../global/exceptions/object-validation.error';
import type { ValidationError } from '../../global/interfaces/types/validation-error.type';

/**
 * Converts Zod's path array to dot-notation string.
 *
 * @param path - Array of path segments from Zod error
 * @returns Normalized path string (e.g., "user.email", "items[0]")
 */
const formatPath = (path: (string | number | symbol)[]): string => {
  if (!path.length) return 'root';
  return path
    .map((segment, index) => {
      if (typeof segment === 'number') return `[${segment}]`;
      if (typeof segment === 'symbol') return segment.description ?? String(segment);
      return index === 0 ? segment : `.${segment}`;
    })
    .join('');
};

/**
 * Transforms Zod issues to framework ValidationError format.
 */
const toValidationErrors = (issues: z.core.$ZodIssue[]): ValidationError[] =>
  issues.map((issue) => ({
    field: formatPath(issue?.path ?? []),
    message: issue?.message ?? 'Validation failed',
  }));

/**
 * Zod adapter implementing the ObjectValidatorPort interface.
 *
 * @implements {ObjectValidatorPort<z.ZodTypeAny>}
 */
export class ZodObjectValidator implements ObjectValidatorPort<z.ZodTypeAny> {
  /**
   * Validates a value against a Zod schema.
   *
   * @typeParam T - The validated output type
   * @param schema - Zod schema to validate against
   * @param value - Unknown value to validate
   * @returns The validated and typed value
   * @throws {ObjectValidationError} When validation fails
   */
  public validateObject<T>(schema: z.ZodType<T>, value: unknown): T;
  public validateObject(schema: z.ZodTypeAny, value: unknown): unknown;
  public validateObject(schema: z.ZodTypeAny, value: unknown): unknown {
    const result = schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    throw new ObjectValidationError({
      message: 'Object validation failed',
      cause: result.error,
      validationErrors: toValidationErrors(result.error.issues),
    });
  }

  /**
   * Creates a bound validator from a Zod schema.
   *
   * @typeParam T - The validated output type
   * @param schema - Zod schema to bind
   * @returns A BoundValidator ready for use with BaseDto or BaseValueObject
   */
  public withSchema<T>(schema: z.ZodType<T>): BoundValidator<T>;
  public withSchema(schema: z.ZodTypeAny): BoundValidator<unknown>;
  public withSchema(schema: z.ZodTypeAny): BoundValidator<unknown> {
    return {
      validate: (value: unknown) => this.validateObject(schema, value),
    };
  }
}
