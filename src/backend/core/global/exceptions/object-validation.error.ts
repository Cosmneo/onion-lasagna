import { CodedError } from './coded-error.error';
import type { ValidationError } from '../interfaces/types/validation-error.type';

/**
 * Error thrown when object validation fails.
 *
 * Contains structured validation errors with field paths and messages,
 * making it easy to report specific validation failures to clients.
 * Thrown by all validator implementations (Zod, ArkType, TypeBox, Valibot).
 *
 * **Flow:**
 * 1. Validator throws `ObjectValidationError` with field-level errors
 * 2. Controller catches and converts to {@link InvalidRequestError}
 * 3. HTTP layer maps to 400 Bad Request with error details
 *
 * @example
 * ```typescript
 * try {
 *   const dto = CreateUserDto.create(invalidData);
 * } catch (error) {
 *   if (error instanceof ObjectValidationError) {
 *     console.log(error.validationErrors);
 *     // [
 *     //   { field: 'email', message: 'Invalid email format' },
 *     //   { field: 'age', message: 'Must be a positive number' }
 *     // ]
 *   }
 * }
 * ```
 */
export class ObjectValidationError extends CodedError {
  /**
   * Array of field-level validation errors.
   *
   * Each entry contains:
   * - `field`: Dot-notation path to the invalid field (e.g., 'user.email')
   * - `message`: Human-readable validation failure message
   */
  validationErrors: ValidationError[];

  /**
   * Creates a new ObjectValidationError instance.
   *
   * @param options - Error configuration
   * @param options.message - Human-readable summary message
   * @param options.code - Machine-readable error code (default: 'OBJECT_VALIDATION_ERROR')
   * @param options.cause - Optional underlying error from validation library
   * @param options.validationErrors - Array of field-level validation errors
   */
  constructor({
    message,
    code = 'OBJECT_VALIDATION_ERROR',
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
   * Creates an ObjectValidationError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new ObjectValidationError instance with the cause attached
   */
  static override fromError(cause: unknown): ObjectValidationError {
    return new ObjectValidationError({
      message: cause instanceof Error ? cause.message : 'Validation failed',
      cause,
      validationErrors: [],
    });
  }
}
