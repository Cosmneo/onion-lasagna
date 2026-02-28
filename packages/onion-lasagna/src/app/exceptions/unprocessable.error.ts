import { ErrorCodes, type AppErrorCode } from '../../global/exceptions/error-codes.const';
import { UseCaseError } from './use-case.error';

/**
 * Error thrown when a request is valid but cannot be processed.
 *
 * The request is syntactically correct and passes validation, but
 * business logic prevents the operation from being completed.
 *
 * **When to throw:**
 * - Business rule prevents operation (e.g., insufficient balance)
 * - Invalid state transition (e.g., canceling a completed order)
 * - Preconditions not met for the operation
 *
 * @example
 * ```typescript
 * if (account.balance < amount) {
 *   throw new UnprocessableError({
 *     message: 'Insufficient balance for withdrawal',
 *     code: 'INSUFFICIENT_BALANCE',
 *   });
 * }
 * ```
 *
 * @extends UseCaseError
 */
export class UnprocessableError extends UseCaseError {
  /**
   * Creates a new UnprocessableError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of why the request cannot be processed
   * @param options.code - Machine-readable error code (default: 'UNPROCESSABLE')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.App.UNPROCESSABLE,
    cause,
  }: {
    message: string;
    code?: AppErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates an UnprocessableError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new UnprocessableError instance with the cause attached
   */
  static override fromError(cause: unknown): UnprocessableError {
    return new UnprocessableError({
      message: cause instanceof Error ? cause.message : 'Unprocessable request',
      cause,
    });
  }
}
