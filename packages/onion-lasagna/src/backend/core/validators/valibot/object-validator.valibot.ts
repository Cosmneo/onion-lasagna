/**
 * Valibot implementation of the ObjectValidatorPort.
 *
 * Adapts Valibot's validation API to the framework's validator abstraction,
 * converting Valibot issues to {@link ObjectValidationError} with normalized paths.
 *
 * **Path Format (By Design):**
 * Each validation library reports error paths differently. Valibot uses
 * an array of PathItem objects with `key` properties. The internal `formatPath`
 * function normalizes this to a consistent format:
 * - Object fields: `user.email`
 * - Array indices: `items[0].name`
 * - Root-level: `root`
 *
 * @example Direct usage
 * ```typescript
 * const validator = new ValibotObjectValidator();
 * const result = validator.validateObject(v.string(), 'hello');
 * ```
 *
 * @example With bootstrap (recommended)
 * ```typescript
 * import { createValibotValidator } from '@cosmneo/onion-lasagna/backend/core/validators/valibot';
 * const emailValidator = createValibotValidator(v.pipe(v.string(), v.email()));
 * ```
 *
 * @module
 */
import { safeParse } from 'valibot';
import type { BaseSchema, BaseIssue } from 'valibot';
import type {
  BoundValidator,
  ObjectValidatorPort,
} from '../../global/interfaces/ports/object-validator.port';
import { ObjectValidationError } from '../../global/exceptions/object-validation.error';
import type { ValidationError } from '../../global/interfaces/types/validation-error.type';

/**
 * Valibot path item structure.
 */
interface PathItem {
  key: unknown;
}

/**
 * Converts Valibot's PathItem array to dot-notation string.
 *
 * @param path - Array of PathItem objects from Valibot issue
 * @returns Normalized path string (e.g., "user.email", "items[0]")
 */
const formatPath = (path: readonly PathItem[] | undefined): string => {
  if (!path?.length) return 'root';
  return path
    .map((item, index) => {
      const segment = item.key;
      if (typeof segment === 'number') return `[${segment}]`;
      if (typeof segment === 'symbol') return segment.description ?? String(segment);
      return index === 0 ? String(segment) : `.${String(segment)}`;
    })
    .join('');
};

/**
 * Transforms Valibot issues to framework ValidationError format.
 */
const toValidationErrors = (issues: BaseIssue<unknown>[]): ValidationError[] =>
  issues.map((issue) => ({
    field: formatPath(issue?.path as readonly PathItem[] | undefined),
    message: issue?.message ?? 'Validation failed',
  }));

/**
 * Valibot adapter implementing the ObjectValidatorPort interface.
 *
 * @implements {ObjectValidatorPort<BaseSchema>}
 */
export class ValibotObjectValidator implements ObjectValidatorPort<
  BaseSchema<unknown, unknown, BaseIssue<unknown>>
> {
  /**
   * Validates a value against a Valibot schema.
   *
   * @typeParam T - The validated output type
   * @param schema - Valibot BaseSchema to validate against
   * @param value - Unknown value to validate
   * @returns The validated and typed value
   * @throws {ObjectValidationError} When validation fails
   */
  public validateObject<T>(schema: BaseSchema<unknown, T, BaseIssue<unknown>>, value: unknown): T;
  public validateObject(
    schema: BaseSchema<unknown, unknown, BaseIssue<unknown>>,
    value: unknown,
  ): unknown;
  public validateObject(
    schema: BaseSchema<unknown, unknown, BaseIssue<unknown>>,
    value: unknown,
  ): unknown {
    const result = safeParse(schema, value);
    if (result.success) {
      return result.output;
    }

    throw new ObjectValidationError({
      message: 'Object validation failed',
      cause: result.issues,
      validationErrors: toValidationErrors(result.issues),
    });
  }

  /**
   * Creates a bound validator from a Valibot schema.
   *
   * @typeParam T - The validated output type
   * @param schema - Valibot BaseSchema to bind
   * @returns A BoundValidator ready for use with BaseDto or BaseValueObject
   */
  public withSchema<T>(schema: BaseSchema<unknown, T, BaseIssue<unknown>>): BoundValidator<T>;
  public withSchema(
    schema: BaseSchema<unknown, unknown, BaseIssue<unknown>>,
  ): BoundValidator<unknown>;
  public withSchema(
    schema: BaseSchema<unknown, unknown, BaseIssue<unknown>>,
  ): BoundValidator<unknown> {
    return {
      validate: (value: unknown) => this.validateObject(schema, value),
    };
  }
}
