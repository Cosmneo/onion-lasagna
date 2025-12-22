import type { TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import type {
  BoundValidator,
  ObjectValidatorPort,
} from '../../global/interfaces/ports/object-validator.port';
import { ObjectValidationError } from '../../global/exceptions/object-validation.error';
import type { ValidationError } from '../../global/interfaces/types/validation-error.type';

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

const toValidationErrors = (
  errors: Iterable<{ path: string; message: string }>,
): ValidationError[] =>
  [...errors].map((error) => ({
    field: formatPath(error.path),
    message: error.message,
  }));

export class TypeBoxObjectValidator implements ObjectValidatorPort<TSchema> {
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

  public withSchema<T>(schema: TSchema): BoundValidator<T>;
  public withSchema(schema: TSchema): BoundValidator<unknown>;
  public withSchema(schema: TSchema): BoundValidator<unknown> {
    return {
      validate: (value: unknown) => this.validateObject(schema, value),
    };
  }
}
