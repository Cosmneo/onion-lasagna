import type { ErrorItem } from '../types';
import { HttpException } from './http.exception';

/**
 * HTTP 400 Bad Request exception.
 *
 * Thrown when the request is malformed or contains invalid data.
 * Use this for validation errors, missing required fields, or incorrect formats.
 *
 * @example
 * ```typescript
 * throw new BadRequestException({
 *   message: 'Validation failed',
 *   errorItems: [
 *     { item: 'email', message: 'Invalid email format' },
 *     { item: 'age', message: 'Must be a positive number' },
 *   ],
 * });
 * ```
 */
export class BadRequestException extends HttpException {
  readonly statusCode = 400;

  constructor({
    message = 'Bad Request',
    code = 'BAD_REQUEST',
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
