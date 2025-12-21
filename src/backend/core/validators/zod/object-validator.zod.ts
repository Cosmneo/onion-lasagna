import type { z } from 'zod';
import type {
  BoundValidator,
  ObjectValidatorPort,
} from '../../global/interfaces/ports/object-validator.port';
import { ObjectValidationError } from '../../global/exceptions/object-validation.error';
import type { ValidationError } from '../../global/interfaces/types/validation-error.type';

const formatPath = (path: (string | number | symbol)[]): string => {
  if (!path.length) return 'root';
  return path
    .map((segment, index) => {
      if (typeof segment === 'number') return `[${segment}]`;
      if (typeof segment === 'symbol') return segment.description ?? 'symbol';
      return index === 0 ? segment : `.${segment}`;
    })
    .join('');
};

const toValidationErrors = (issues: z.core.$ZodIssue[]): ValidationError[] =>
  issues.map((issue) => ({
    field: formatPath(issue.path),
    message: issue.message,
  }));

export class ZodObjectValidator implements ObjectValidatorPort<z.ZodTypeAny> {
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

  public withSchema<T>(schema: z.ZodType<T>): BoundValidator<T>;
  public withSchema(schema: z.ZodTypeAny): BoundValidator<unknown>;
  public withSchema(schema: z.ZodTypeAny): BoundValidator<unknown> {
    return {
      validate: (value: unknown) => this.validateObject(schema, value),
    };
  }
}
