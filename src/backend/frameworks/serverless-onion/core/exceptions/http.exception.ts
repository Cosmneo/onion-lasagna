import { ControllerError } from '../../../../core/bounded-context/presentation/exceptions/controller.error';
import type { ErrorItem, HttpExceptionResponse } from '../types';

/**
 * Base class for HTTP exceptions in serverless applications.
 *
 * All HTTP exceptions extend this class and provide a specific status code.
 * The `toResponse()` method converts the exception to the standard
 * {@link HttpExceptionResponse} format.
 *
 * @example
 * ```typescript
 * class BadRequestException extends HttpException {
 *   readonly statusCode = 400;
 * }
 *
 * const error = new BadRequestException({
 *   message: 'Invalid input',
 *   errorItems: [{ item: 'email', message: 'Invalid format' }],
 * });
 *
 * const response = error.toResponse();
 * // { statusCode: 400, message: 'Invalid input', errorCode: 'BAD_REQUEST', errorItems: [...] }
 * ```
 */
export abstract class HttpException extends ControllerError {
  /**
   * HTTP status code for this exception.
   */
  abstract readonly statusCode: number;

  /**
   * Optional detailed error items for field-level errors.
   */
  readonly errorItems?: ErrorItem[];

  /**
   * Creates a new HttpException instance.
   *
   * @param options - Exception configuration
   * @param options.message - Human-readable error message
   * @param options.code - Machine-readable error code
   * @param options.cause - Optional underlying error
   * @param options.errorItems - Optional detailed error items
   */
  constructor({
    message,
    code,
    cause,
    errorItems,
  }: {
    message: string;
    code: string;
    cause?: unknown;
    errorItems?: ErrorItem[];
  }) {
    super({ message, code, cause });
    this.errorItems = errorItems;
  }

  /**
   * Converts this exception to a standard HTTP exception response.
   *
   * @returns The HTTP exception response object
   */
  toResponse(): HttpExceptionResponse {
    return {
      statusCode: this.statusCode,
      message: this.message,
      errorCode: this.code,
      ...(this.errorItems && { errorItems: this.errorItems }),
    };
  }
}
