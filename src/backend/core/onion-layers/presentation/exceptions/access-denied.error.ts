import { CodedError } from '../../../global/exceptions/coded-error.error';
import {
  ErrorCodes,
  type PresentationErrorCode,
} from '../../../global/exceptions/error-codes.const';

/**
 * Error thrown when access to a resource is denied.
 *
 * Indicates that the requester does not have permission to perform
 * the requested operation. Thrown by {@link GuardedController} when
 * an access guard returns `isAllowed: false`.
 *
 * **When thrown:**
 * - Access guard denies the request
 * - User lacks required permissions
 * - Resource ownership check fails
 *
 * @example
 * ```typescript
 * // Automatically thrown by @AllowRequest decorator
 * @AllowRequest<Request>((req) => ({
 *   isAllowed: req.user?.role === 'admin',
 *   reason: 'Admin access required',
 * }))
 * ```
 *
 * @example Manual usage
 * ```typescript
 * if (!user.canAccess(resource)) {
 *   throw new AccessDeniedError({
 *     message: 'You do not have access to this resource',
 *     code: 'RESOURCE_ACCESS_DENIED',
 *   });
 * }
 * ```
 *
 * @extends CodedError
 */
export class AccessDeniedError extends CodedError {
  /**
   * Creates a new AccessDeniedError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of why access was denied
   * @param options.code - Machine-readable error code (default: 'ACCESS_DENIED')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.Presentation.ACCESS_DENIED,
    cause,
  }: {
    message: string;
    code?: PresentationErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates an AccessDeniedError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new AccessDeniedError instance with the cause attached
   */
  static override fromError(cause: unknown): AccessDeniedError {
    return new AccessDeniedError({
      message: cause instanceof Error ? cause.message : 'Access denied',
      cause,
    });
  }
}
