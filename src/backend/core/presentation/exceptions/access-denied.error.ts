import { CodedError } from '../../global/exceptions/coded-error.error';

export class AccessDeniedError extends CodedError {
  constructor({
    message,
    code = 'ACCESS_DENIED',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
