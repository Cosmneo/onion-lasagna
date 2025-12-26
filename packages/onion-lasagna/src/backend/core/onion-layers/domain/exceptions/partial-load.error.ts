import { ErrorCodes, type DomainErrorCode } from '../../../global/exceptions/error-codes.const';
import { DomainError } from './domain.error';

/**
 * Error thrown when an entity or aggregate is partially loaded.
 *
 * Indicates that required data is missing, typically due to incomplete
 * database queries or lazy loading issues. This error should not escape
 * the application boundary—it represents an internal system failure.
 *
 * **When to throw:**
 * - Required relation not loaded
 * - Aggregate missing expected child entities
 * - Incomplete projection from data layer
 *
 * @example
 * ```typescript
 * if (!order.customer) {
 *   throw new PartialLoadError({
 *     message: 'Order customer relation not loaded',
 *     code: 'ORDER_CUSTOMER_NOT_LOADED',
 *   });
 * }
 * ```
 *
 * @extends DomainError
 */
export class PartialLoadError extends DomainError {
  /**
   * Creates a new PartialLoadError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of what was not loaded
   * @param options.code - Machine-readable error code (default: 'PARTIAL_LOAD')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.Domain.PARTIAL_LOAD,
    cause,
  }: {
    message: string;
    code?: DomainErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates a PartialLoadError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new PartialLoadError instance with the cause attached
   */
  static override fromError(cause: unknown): PartialLoadError {
    return new PartialLoadError({
      message: cause instanceof Error ? cause.message : 'Partial load error',
      cause,
    });
  }
}
