import { CodedError } from '../../../global/exceptions/coded-error.error';
import type { ValidationError } from '../../../global/interfaces/types/validation-error.type';

/**
 * Error thrown when request validation fails at the controller level.
 *
 * Contains structured validation errors with field paths and messages,
 * converted from {@link ObjectValidationError} by {@link BaseController}.
 * Provides detailed feedback about which fields failed validation.
 *
 * **When thrown:**
 * - Request DTO validation fails
 * - Malformed request data
 * - Missing required fields
 *
 * @example
 * ```typescript
 * // Automatically thrown by BaseController when DTO validation fails
 * // The validationErrors array contains field-level details:
 * // [
 * //   { field: 'email', message: 'Invalid email format' },
 * //   { field: 'age', message: 'Must be a positive number' }
 * // ]
 * ```
 *
 * @example Manual usage
 * ```typescript
 * throw new InvalidRequestError({
 *   message: 'Request validation failed',
 *   validationErrors: [
 *     { field: 'username', message: 'Username is required' },
 *   ],
 * });
 * ```
 *
 * @extends CodedError
 */
export class InvalidRequestError extends CodedError {
  /**
   * Array of field-level validation errors.
   *
   * Each entry contains:
   * - `field`: Dot-notation path to the invalid field
   * - `message`: Human-readable validation failure message
   */
  readonly validationErrors: ValidationError[];

  /**
   * Creates a new InvalidRequestError instance.
   *
   * @param options - Error configuration
   * @param options.message - Summary of the validation failure
   * @param options.code - Machine-readable error code (default: 'INVALID_REQUEST')
   * @param options.cause - Optional underlying error
   * @param options.validationErrors - Array of field-level validation errors
   */
  constructor({
    message,
    code = 'INVALID_REQUEST',
    cause,
    validationErrors,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
    validationErrors: ValidationError[];
  }) {
    super({ message, code, cause });
    this.validationErrors = validationErrors;
  }

  /**
   * Creates an InvalidRequestError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new InvalidRequestError instance with the cause attached
   */
  static override fromError(cause: unknown): InvalidRequestError {
    return new InvalidRequestError({
      message: cause instanceof Error ? cause.message : 'Invalid request',
      cause,
      validationErrors: [],
    });
  }
}
