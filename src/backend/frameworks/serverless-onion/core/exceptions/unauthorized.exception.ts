import { StatusCodes } from 'http-status-codes';

import type { ErrorItem } from '../types';
import { HttpException } from './http.exception';

/**
 * HTTP 401 Unauthorized exception.
 *
 * Thrown when authentication is required but missing or invalid.
 * Use this for missing tokens, expired tokens, or invalid credentials.
 *
 * @example
 * ```typescript
 * throw new UnauthorizedException({
 *   message: 'Invalid or expired token',
 * });
 * ```
 */
export class UnauthorizedException extends HttpException {
  readonly statusCode = StatusCodes.UNAUTHORIZED;

  constructor({
    message = 'Unauthorized',
    code = 'UNAUTHORIZED',
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
