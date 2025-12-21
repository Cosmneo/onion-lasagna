import { CodedError } from '../../../global/exceptions/coded-error.error';

/**
 * API errors represent inbound contract failures (validation, missing resources, etc).
 */
export class UseCaseError extends CodedError {
  constructor({
    message,
    code = 'USE_CASE_ERROR',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
