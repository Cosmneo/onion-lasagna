import type { ErrorItem } from '../types';
import { HttpException } from './http.exception';

/**
 * HTTP 403 Forbidden exception.
 *
 * Thrown when the user is authenticated but lacks permission for the action.
 * Use this for authorization failures and access control violations.
 *
 * @example
 * ```typescript
 * throw new ForbiddenException({
 *   message: 'You do not have permission to access this resource',
 * });
 * ```
 */
export class ForbiddenException extends HttpException {
  readonly statusCode = 403;

  constructor({
    message = 'Forbidden',
    code = 'FORBIDDEN',
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
