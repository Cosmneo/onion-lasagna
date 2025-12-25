import { ErrorCodes, type InfraErrorCode } from '../../../global/exceptions/error-codes.const';
import { InfraError } from './infra.error';

/**
 * Error thrown when an operation exceeds its time limit.
 *
 * Indicates that a request or operation took longer than the
 * configured timeout threshold.
 *
 * **When to throw:**
 * - Request timeout exceeded
 * - Database query timeout
 * - External API response timeout
 * - Lock acquisition timeout
 *
 * @example
 * ```typescript
 * const controller = new AbortController();
 * setTimeout(() => controller.abort(), 5000);
 *
 * try {
 *   await fetch(url, { signal: controller.signal });
 * } catch (error) {
 *   throw new TimeoutError({
 *     message: 'Request timed out after 5 seconds',
 *     code: 'REQUEST_TIMEOUT',
 *     cause: error,
 *   });
 * }
 * ```
 *
 * @extends InfraError
 */
export class TimeoutError extends InfraError {
  /**
   * Creates a new TimeoutError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of what timed out
   * @param options.code - Machine-readable error code (default: 'TIMEOUT_ERROR')
   * @param options.cause - Optional underlying timeout error
   */
  constructor({
    message,
    code = ErrorCodes.Infra.TIMEOUT_ERROR,
    cause,
  }: {
    message: string;
    code?: InfraErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates a TimeoutError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new TimeoutError instance with the cause attached
   */
  static override fromError(cause: unknown): TimeoutError {
    return new TimeoutError({
      message: cause instanceof Error ? cause.message : 'Operation timed out',
      cause,
    });
  }
}
