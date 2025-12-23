import type { ErrorItem } from '../types';
import { HttpException } from './http.exception';

/**
 * HTTP 422 Unprocessable Entity exception.
 *
 * Thrown when the request is syntactically correct but semantically invalid.
 * Use this for business rule violations that are not simple validation errors.
 *
 * @example
 * ```typescript
 * throw new UnprocessableEntityException({
 *   message: 'Cannot process order: insufficient inventory',
 *   code: 'INSUFFICIENT_INVENTORY',
 * });
 * ```
 */
export class UnprocessableEntityException extends HttpException {
  readonly statusCode = 422;

  constructor({
    message = 'Unprocessable Entity',
    code = 'UNPROCESSABLE_ENTITY',
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
