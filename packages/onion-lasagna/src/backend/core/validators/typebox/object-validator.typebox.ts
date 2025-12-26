/**
 * TypeBox implementation of the ObjectValidatorPort.
 *
 * Adapts TypeBox's validation API to the framework's validator abstraction,
 * converting TypeBox errors to {@link ObjectValidationError} with normalized paths.
 *
 * **Path Format (By Design):**
 * Each validation library reports error paths differently. TypeBox uses
 * JSON Pointer format (`/field/0/subfield`). The internal `formatPath` function
 * normalizes this to a consistent format:
 * - Object fields: `user.email`
 * - Array indices: `items[0].name`
 * - Root-level: `root`
 *
 * @example Direct usage
 * ```typescript
 * const validator = new TypeBoxObjectValidator();
 * const result = validator.validateObject(Type.String(), 'hello');
 * ```
 *
 * @example With bootstrap (recommended)
 * ```typescript
 * import { createTypeBoxValidator } from '@cosmneo/onion-lasagna/backend/core/validators/typebox';
 * const stringValidator = createTypeBoxValidator<string>(Type.String());
 * ```
 *
 * @module
 */
import type { TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import type {
  BoundValidator,
  ObjectValidatorPort,
} from '../../global/interfaces/ports/object-validator.port';
import { ObjectValidationError } from '../../global/exceptions/object-validation.error';
import type { ValidationError } from '../../global/interfaces/types/validation-error.type';

/**
 * Converts TypeBox's JSON Pointer path to dot-notation string.
 *
 * @param path - JSON Pointer path from TypeBox error (e.g., "/user/email")
 * @returns Normalized path string (e.g., "user.email", "items[0]")
 */
const formatPath = (path: string): string => {
  if (!path || path === '/') return 'root';
  // Convert JSON pointer format (/field/0/subfield) to dot notation (field[0].subfield)
  return path
    .slice(1) // Remove leading /
    .split('/')
    .map((segment, index) => {
      const num = Number(segment);
      if (!isNaN(num)) return `[${num}]`;
      return index === 0 ? segment : `.${segment}`;
    })
    .join('');
};

/**
 * Transforms TypeBox errors to framework ValidationError format.
 */
const toValidationErrors = (
  errors: Iterable<{ path?: string; message?: string }>,
): ValidationError[] =>
  [...errors].map((error) => ({
    field: formatPath(error?.path ?? '/'),
    message: error?.message ?? 'Validation failed',
  }));

/**
 * TypeBox adapter implementing the ObjectValidatorPort interface.
 *
 * @implements {ObjectValidatorPort<TSchema>}
 */
export class TypeBoxObjectValidator implements ObjectValidatorPort<TSchema> {
  /**
   * Validates a value against a TypeBox schema.
   *
   * @typeParam T - The validated output type
   * @param schema - TypeBox TSchema to validate against
   * @param value - Unknown value to validate
   * @returns The validated and typed value
   * @throws {ObjectValidationError} When validation fails
   */
  public validateObject<T>(schema: TSchema, value: unknown): T;
  public validateObject(schema: TSchema, value: unknown): unknown;
  public validateObject(schema: TSchema, value: unknown): unknown {
    const errors = [...Value.Errors(schema, value)];
    if (errors.length === 0) {
      return Value.Decode(schema, value);
    }

    throw new ObjectValidationError({
      message: 'Object validation failed',
      cause: errors,
      validationErrors: toValidationErrors(errors),
    });
  }

  /**
   * Creates a bound validator from a TypeBox schema.
   *
   * @typeParam T - The validated output type
   * @param schema - TypeBox TSchema to bind
   * @returns A BoundValidator ready for use with BaseDto or BaseValueObject
   */
  public withSchema<T>(schema: TSchema): BoundValidator<T>;
  public withSchema(schema: TSchema): BoundValidator<unknown>;
  public withSchema(schema: TSchema): BoundValidator<unknown> {
    return {
      validate: (value: unknown) => this.validateObject(schema, value),
    };
  }
}
