import { safeParse } from 'valibot';
import type { BaseSchema, BaseIssue } from 'valibot';
import type {
  BoundValidator,
  ObjectValidatorPort,
} from '../../global/interfaces/ports/object-validator.port';
import { ObjectValidationError } from '../../global/exceptions/object-validation.error';
import type { ValidationError } from '../../global/interfaces/types/validation-error.type';

interface PathItem {
  key: unknown;
}

const formatPath = (path: readonly PathItem[] | undefined): string => {
  if (!path?.length) return 'root';
  return path
    .map((item, index) => {
      const segment = item.key;
      if (typeof segment === 'number') return `[${segment}]`;
      if (typeof segment === 'symbol') return segment.description ?? 'symbol';
      return index === 0 ? String(segment) : `.${String(segment)}`;
    })
    .join('');
};

const toValidationErrors = (issues: BaseIssue<unknown>[]): ValidationError[] =>
  issues.map((issue) => ({
    field: formatPath(issue.path as readonly PathItem[] | undefined),
    message: issue.message,
  }));

export class ValibotObjectValidator implements ObjectValidatorPort<
  BaseSchema<unknown, unknown, BaseIssue<unknown>>
> {
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
