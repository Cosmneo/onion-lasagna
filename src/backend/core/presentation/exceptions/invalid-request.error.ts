import { CodedError } from '../../global/exceptions/coded-error.error';
import type { ValidationError } from '../../global/interfaces/types/validation-error.type';

export class InvalidRequestError extends CodedError {
  readonly validationErrors: ValidationError[];

  constructor({
    message,
    code = 'INVALID_REQUEST',
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
