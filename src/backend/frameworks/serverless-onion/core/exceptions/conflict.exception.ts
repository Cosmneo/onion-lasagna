import { StatusCodes } from 'http-status-codes';

import type { ErrorItem } from '../types';
import { HttpException } from './http.exception';

/**
 * HTTP 409 Conflict exception.
 *
 * Thrown when the request conflicts with the current state of the resource.
 * Use this for duplicate entries, version conflicts, or state violations.
 *
 * @example
 * ```typescript
 * throw new ConflictException({
 *   message: 'Email already exists',
 *   code: 'EMAIL_ALREADY_EXISTS',
 * });
 * ```
 */
export class ConflictException extends HttpException {
  readonly statusCode = StatusCodes.CONFLICT;

  constructor({
    message = 'Conflict',
    code = 'CONFLICT',
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
