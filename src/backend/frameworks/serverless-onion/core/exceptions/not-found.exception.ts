import { StatusCodes } from 'http-status-codes';

import type { ErrorItem } from '../types';
import { HttpException } from './http.exception';

/**
 * HTTP 404 Not Found exception.
 *
 * Thrown when the requested resource does not exist.
 * Use this when a specific entity, endpoint, or resource cannot be found.
 *
 * @example
 * ```typescript
 * throw new NotFoundException({
 *   message: 'User not found',
 *   code: 'USER_NOT_FOUND',
 * });
 * ```
 */
export class NotFoundException extends HttpException {
  readonly statusCode = StatusCodes.NOT_FOUND;

  constructor({
    message = 'Not Found',
    code = 'NOT_FOUND',
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
