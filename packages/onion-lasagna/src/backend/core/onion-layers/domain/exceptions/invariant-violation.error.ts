import { ErrorCodes, type DomainErrorCode } from '../../../global/exceptions/error-codes.const';
import { DomainError } from './domain.error';

/**
 * Error thrown when a domain invariant is violated.
 *
 * Invariants are business rules that must always be true. This error
 * indicates a programming error or corrupted state—if inputs are
 * properly validated, this should never occur in production.
 *
 * **When to throw:**
 * - Business rule violations (e.g., `updatedAt < createdAt`)
 * - Assert-style guards in domain logic
 * - Invalid state transitions
 *
 * @example
 * ```typescript
 * if (order.status === 'shipped' && order.items.length === 0) {
 *   throw new InvariantViolationError({
 *     message: 'Shipped order must have at least one item',
 *     code: 'EMPTY_SHIPPED_ORDER',
 *   });
 * }
 * ```
 *
 * @extends DomainError
 */
export class InvariantViolationError extends DomainError {
  /**
   * Creates a new InvariantViolationError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of the violated invariant
   * @param options.code - Machine-readable error code (default: 'INVARIANT_VIOLATION')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.Domain.INVARIANT_VIOLATION,
    cause,
  }: {
    message: string;
    code?: DomainErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates an InvariantViolationError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new InvariantViolationError instance with the cause attached
   */
  static override fromError(cause: unknown): InvariantViolationError {
    return new InvariantViolationError({
      message: cause instanceof Error ? cause.message : 'Invariant violation',
      cause,
    });
  }
}
