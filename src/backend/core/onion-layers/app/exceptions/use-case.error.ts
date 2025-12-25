import { CodedError } from '../../../global/exceptions/coded-error.error';
import { ErrorCodes, type AppErrorCode } from '../../../global/exceptions/error-codes.const';

/**
 * Base error class for application layer (use case) failures.
 *
 * Use case errors represent failures in the application's business logic
 * orchestration, such as resource conflicts, missing entities, or
 * unprocessable requests. They bridge domain errors to the presentation layer.
 *
 * **When to throw:**
 * - Resource not found (e.g., "User with ID X not found")
 * - Conflict states (e.g., "Email already registered")
 * - Unprocessable business operations
 *
 * **Child classes:**
 * - {@link ConflictError} - Resource state conflicts (HTTP 409)
 * - {@link NotFoundError} - Resource not found (HTTP 404)
 * - {@link UnprocessableError} - Valid but unprocessable request (HTTP 422)
 *
 * @example
 * ```typescript
 * const user = await this.userRepo.findById(id);
 * if (!user) {
 *   throw new NotFoundError({
 *     message: `User with ID ${id} not found`,
 *     code: 'USER_NOT_FOUND',
 *   });
 * }
 * ```
 */
export class UseCaseError extends CodedError {
  /**
   * Creates a new UseCaseError instance.
   *
   * @param options - Error configuration
   * @param options.message - Human-readable error description
   * @param options.code - Machine-readable error code (default: 'USE_CASE_ERROR')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.App.USE_CASE_ERROR,
    cause,
  }: {
    message: string;
    code?: AppErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates a UseCaseError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new UseCaseError instance with the cause attached
   */
  static override fromError(cause: unknown): UseCaseError {
    return new UseCaseError({
      message: cause instanceof Error ? cause.message : 'Use case error',
      cause,
    });
  }
}
