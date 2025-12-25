import { StatusCodes } from 'http-status-codes';

import type { ErrorItem } from '../types';
import { HttpException } from './http.exception';

/**
 * HTTP 500 Internal Server Error exception.
 *
 * Thrown for unexpected server-side errors.
 * The message should be generic to avoid leaking internal details.
 *
 * **Security Note:** Never expose internal error details, stack traces,
 * or sensitive information in the response message.
 *
 * @example
 * ```typescript
 * // Wrap internal errors without exposing details
 * throw new InternalServerErrorException({
 *   message: 'An unexpected error occurred',
 *   cause: originalError, // Logged but not exposed
 * });
 * ```
 */
export class InternalServerErrorException extends HttpException {
  readonly statusCode = StatusCodes.INTERNAL_SERVER_ERROR;

  constructor({
    message = 'Internal Server Error',
    code = 'INTERNAL_SERVER_ERROR',
    cause,
    errorItems,
  }: {
    message?: string;
    code?: string;
    cause?: unknown;
    errorItems?: ErrorItem[];
  } = {}) {
    super({ message, code, cause, errorItems });
  }
}
