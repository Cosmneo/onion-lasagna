import { CodedError } from './coded-error.error';
import type { ValidationError } from '../interfaces/types/validation-error.type';

export class ObjectValidationError extends CodedError {
  validationErrors: ValidationError[];
  constructor({
    message,
    code = 'OBJECT_VALIDATION_ERROR',
    cause,
    validationErrors,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
    validationErrors: ValidationError[];
  }) {
    super({ message, code, cause });
    this.validationErrors = validationErrors;
  }
}
