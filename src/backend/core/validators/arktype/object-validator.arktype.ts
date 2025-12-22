import { type Type, type } from 'arktype';
import type {
  BoundValidator,
  ObjectValidatorPort,
} from '../../global/interfaces/ports/object-validator.port';
import { ObjectValidationError } from '../../global/exceptions/object-validation.error';
import type { ValidationError } from '../../global/interfaces/types/validation-error.type';

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

const toValidationErrors = (errors: type.errors): ValidationError[] =>
  [...errors].map((error) => ({
    field: formatPath(error.path),
    message: error.message,
  }));

export class ArkTypeObjectValidator implements ObjectValidatorPort<Type> {
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

  public withSchema<T>(schema: Type<T>): BoundValidator<T>;
  public withSchema(schema: Type): BoundValidator<unknown>;
  public withSchema(schema: Type): BoundValidator<unknown> {
    return {
      validate: (value: unknown) => this.validateObject(schema, value),
    };
  }
}
