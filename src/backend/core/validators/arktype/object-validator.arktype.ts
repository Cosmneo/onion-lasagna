/**
 * ArkType implementation of the ObjectValidatorPort.
 *
 * Adapts ArkType's validation API to the framework's validator abstraction,
 * converting ArkType errors to {@link ObjectValidationError} with normalized paths.
 *
 * **Path Format (By Design):**
 * Each validation library reports error paths differently. The internal
 * `formatPath` function normalizes ArkType's PropertyKey array to a consistent format:
 * - Object fields: `user.email`
 * - Array indices: `items[0].name`
 * - Root-level: `root`
 *
 * @example Direct usage
 * ```typescript
 * const validator = new ArkTypeObjectValidator();
 * const result = validator.validateObject(type('email'), 'test@example.com');
 * ```
 *
 * @example With bootstrap (recommended)
 * ```typescript
 * import { createArkTypeValidator } from '@cosmneo/onion-lasagna/backend/core/validators/arktype';
 * const emailValidator = createArkTypeValidator(type('email'));
 * ```
 *
 * @module
 */
import { type Type, type } from 'arktype';
import type {
  BoundValidator,
  ObjectValidatorPort,
} from '../../global/interfaces/ports/object-validator.port';
import { ObjectValidationError } from '../../global/exceptions/object-validation.error';
import type { ValidationError } from '../../global/interfaces/types/validation-error.type';

/**
 * Converts ArkType's PropertyKey path to dot-notation string.
 *
 * @param path - Array of path segments from ArkType error
 * @returns Normalized path string (e.g., "user.email", "items[0]")
 */
const formatPath = (path: readonly PropertyKey[]): string => {
  if (!path.length) return 'root';
  return path
    .map((segment, index) => {
      if (typeof segment === 'number') return `[${segment}]`;
      if (typeof segment === 'symbol') return segment.description ?? 'symbol';
      return index === 0 ? String(segment) : `.${segment}`;
    })
    .join('');
};

/**
 * Transforms ArkType errors to framework ValidationError format.
 */
const toValidationErrors = (errors: type.errors): ValidationError[] =>
  [...errors].map((error) => ({
    field: formatPath(error?.path ?? []),
    message: error?.message ?? 'Validation failed',
  }));

/**
 * ArkType adapter implementing the ObjectValidatorPort interface.
 *
 * @implements {ObjectValidatorPort<Type>}
 */
export class ArkTypeObjectValidator implements ObjectValidatorPort<Type> {
  /**
   * Validates a value against an ArkType schema.
   *
   * @typeParam T - The validated output type
   * @param schema - ArkType Type to validate against
   * @param value - Unknown value to validate
   * @returns The validated and typed value
   * @throws {ObjectValidationError} When validation fails
   */
  public validateObject<T>(schema: Type<T>, value: unknown): T;
  public validateObject(schema: Type, value: unknown): unknown;
  public validateObject(schema: Type, value: unknown): unknown {
    const result = schema(value);
    if (result instanceof type.errors) {
      throw new ObjectValidationError({
        message: 'Object validation failed',
        cause: result,
        validationErrors: toValidationErrors(result),
      });
    }
    return result;
  }

  /**
   * Creates a bound validator from an ArkType schema.
   *
   * @typeParam T - The validated output type
   * @param schema - ArkType Type to bind
   * @returns A BoundValidator ready for use with BaseDto or BaseValueObject
   */
  public withSchema<T>(schema: Type<T>): BoundValidator<T>;
  public withSchema(schema: Type): BoundValidator<unknown>;
  public withSchema(schema: Type): BoundValidator<unknown> {
    return {
      validate: (value: unknown) => this.validateObject(schema, value),
    };
  }
}
