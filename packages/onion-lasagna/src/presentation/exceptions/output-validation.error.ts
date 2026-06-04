import { ControllerError } from './controller.error';
import { ErrorCodes, type PresentationErrorCode } from '../../global/exceptions/error-codes.const';

/**
 * Error thrown when output (response) validation fails in a GraphQL handler.
 *
 * This error extends {@link ControllerError} so it is treated as an internal
 * server error (HTTP 500 / GraphQL INTERNAL_ERROR) and its details are
 * **masked from clients**. This prevents leaking internal output field paths,
 * validation constraints, or other implementation details through the API.
 *
 * **Contrast with input validation:**
 * - Input validation failures throw `ObjectValidationError` → client-facing (VALIDATION_ERROR)
 * - Output validation failures throw `OutputValidationError` → masked (INTERNAL_ERROR)
 *
 * **When thrown:**
 * - A GraphQL handler returns data that does not match the declared output schema
 * - Per-item subscription output fails schema validation
 *
 * @extends ControllerError
 */
export class OutputValidationError extends ControllerError {
  protected override get errorTypeName(): string {
    return 'OutputValidationError';
  }

  /**
   * Creates a new OutputValidationError instance.
   *
   * @param options - Error configuration
   * @param options.message - Internal description of the validation failure (not exposed to clients)
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
   * Creates an OutputValidationError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new OutputValidationError instance with the cause attached
   */
  static override fromError(cause: unknown): OutputValidationError {
    return new OutputValidationError({
      message: cause instanceof Error ? cause.message : 'Output validation error',
      cause,
    });
  }
}
