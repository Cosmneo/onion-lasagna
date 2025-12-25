import { ErrorCodes, type AppErrorCode } from '../../../global/exceptions/error-codes.const';
import { UseCaseError } from './use-case.error';

/**
 * Error thrown when an operation conflicts with existing state.
 *
 * Indicates that the requested operation cannot be completed because
 * it would violate uniqueness constraints or cause state conflicts.
 *
 * **When to throw:**
 * - Duplicate unique field (e.g., email already registered)
 * - Optimistic locking conflict (stale version)
 * - Concurrent modification detected
 *
 * @example
 * ```typescript
 * const existing = await this.userRepo.findByEmail(email);
 * if (existing) {
 *   throw new ConflictError({
 *     message: 'Email already registered',
 *     code: 'EMAIL_ALREADY_EXISTS',
 *   });
 * }
 * ```
 *
 * @extends UseCaseError
 */
export class ConflictError extends UseCaseError {
  /**
   * Creates a new ConflictError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of the conflict
   * @param options.code - Machine-readable error code (default: 'CONFLICT')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.App.CONFLICT,
    cause,
  }: {
    message: string;
    code?: AppErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates a ConflictError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new ConflictError instance with the cause attached
   */
  static override fromError(cause: unknown): ConflictError {
    return new ConflictError({
      message: cause instanceof Error ? cause.message : 'Conflict error',
      cause,
    });
  }
}
