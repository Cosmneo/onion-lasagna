import { UseCaseError } from './use-case.error';

/**
 * Error thrown when a requested resource does not exist.
 *
 * Indicates that the entity or resource referenced by the request
 * could not be found in the system.
 *
 * **When to throw:**
 * - Entity lookup by ID returns null
 * - Referenced resource doesn't exist
 * - Parent entity for a child operation not found
 *
 * @example
 * ```typescript
 * const user = await this.userRepo.findById(userId);
 * if (!user) {
 *   throw new NotFoundError({
 *     message: `User with ID ${userId} not found`,
 *     code: 'USER_NOT_FOUND',
 *   });
 * }
 * ```
 *
 * @extends UseCaseError
 */
export class NotFoundError extends UseCaseError {
  /**
   * Creates a new NotFoundError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of what was not found
   * @param options.code - Machine-readable error code (default: 'NOT_FOUND')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = 'NOT_FOUND',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates a NotFoundError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new NotFoundError instance with the cause attached
   */
  static override fromError(cause: unknown): NotFoundError {
    return new NotFoundError({
      message: cause instanceof Error ? cause.message : 'Resource not found',
      cause,
    });
  }
}
