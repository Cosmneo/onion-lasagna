import { CodedError } from '../../../global/exceptions/coded-error.error';
import {
  ErrorCodes,
  type PresentationErrorCode,
} from '../../../global/exceptions/error-codes.const';

/**
 * Base error class for presentation layer (controller) failures.
 *
 * Controller errors represent failures in request handling,
 * such as access control violations or malformed requests.
 * They are the outermost error layer and typically map to HTTP responses.
 *
 * **When to throw:**
 * - Access control failures (unauthorized/forbidden)
 * - Request validation failures
 * - Unexpected controller execution errors
 *
 * **Child classes:**
 * - {@link AccessDeniedError} - Authorization failures (HTTP 403)
 * - {@link InvalidRequestError} - Request validation failures (HTTP 400)
 *
 * @example
 * ```typescript
 * // Thrown automatically by BaseController for unexpected errors
 * throw new ControllerError({
 *   message: 'Controller execution failed',
 *   cause: originalError,
 * });
 * ```
 */
export class ControllerError extends CodedError {
  /**
   * Creates a new ControllerError instance.
   *
   * @param options - Error configuration
   * @param options.message - Human-readable error description
   * @param options.code - Machine-readable error code (default: 'CONTROLLER_ERROR')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.Presentation.CONTROLLER_ERROR,
    cause,
  }: {
    message: string;
    code?: PresentationErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates a ControllerError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new ControllerError instance with the cause attached
   */
  static override fromError(cause: unknown): ControllerError {
    return new ControllerError({
      message: cause instanceof Error ? cause.message : 'Controller error',
      cause,
    });
  }
}
