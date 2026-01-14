import { ErrorCodes, type AppErrorCode } from '../../../global/exceptions/error-codes.const';
import { UseCaseError } from './use-case.error';

/**
 * Error thrown when authentication is required or invalid.
 *
 * Indicates that the user is not authenticated or their authentication
 * credentials are invalid/expired. This is different from `ForbiddenError`
 * which is for authenticated users who lack permission.
 *
 * **When to throw:**
 * - User is not logged in but authentication is required
 * - Authentication token is missing, invalid, or expired
 * - Session has been invalidated
 * - API key is invalid or revoked
 *
 * **Difference from ForbiddenError:**
 * - `UnauthorizedError` (401) = Not authenticated (who are you?)
 * - `ForbiddenError` (403) = Authenticated but not authorized (you can't do this)
 *
 * @example Missing authentication
 * ```typescript
 * protected async authorize(input: Input): Promise<AuthContext> {
 *   if (!input.userId) {
 *     throw new UnauthorizedError({ message: 'Authentication required' });
 *   }
 *
 *   const user = await this.userRepo.findById(input.userId);
 *   if (!user) {
 *     throw new UnauthorizedError({ message: 'Invalid user credentials' });
 *   }
 *
 *   return { user };
 * }
 * ```
 *
 * @example Token validation
 * ```typescript
 * if (!token || isTokenExpired(token)) {
 *   throw new UnauthorizedError({
 *     message: 'Session expired, please log in again',
 *     code: 'SESSION_EXPIRED',
 *   });
 * }
 * ```
 *
 * @extends UseCaseError
 */
export class UnauthorizedError extends UseCaseError {
  /**
   * Creates a new UnauthorizedError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of why authentication failed
   * @param options.code - Machine-readable error code (default: 'UNAUTHORIZED')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.App.UNAUTHORIZED,
    cause,
  }: {
    message: string;
    code?: AppErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates an UnauthorizedError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new UnauthorizedError instance with the cause attached
   */
  static override fromError(cause: unknown): UnauthorizedError {
    return new UnauthorizedError({
      message: cause instanceof Error ? cause.message : 'Authentication required',
      cause,
    });
  }
}
