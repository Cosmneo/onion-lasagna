import { CodedError } from '../../../global/exceptions/coded-error.error';
import { ErrorCodes, type DomainErrorCode } from '../../../global/exceptions/error-codes.const';

/**
 * Base error class for domain layer failures.
 *
 * Domain errors represent violations of business rules, invariants,
 * or aggregate consistency. They originate from the core domain logic
 * and should be caught and handled by the application layer.
 *
 * **When to throw:**
 * - Business rule violations (e.g., "Cannot withdraw more than balance")
 * - Invariant violations (e.g., "Email format invalid")
 * - Aggregate consistency failures
 *
 * **Child classes:**
 * - {@link InvariantViolationError} - Value object or entity invariant failures
 * - {@link PartialLoadError} - Incomplete aggregate reconstitution
 *
 * @example
 * ```typescript
 * if (account.balance < amount) {
 *   throw new DomainError({
 *     message: 'Insufficient funds for withdrawal',
 *     code: 'INSUFFICIENT_FUNDS',
 *   });
 * }
 * ```
 */
export class DomainError extends CodedError {
  /**
   * Creates a new DomainError instance.
   *
   * @param options - Error configuration
   * @param options.message - Human-readable error description
   * @param options.code - Machine-readable error code (default: 'DOMAIN_ERROR')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.Domain.DOMAIN_ERROR,
    cause,
  }: {
    message: string;
    code?: DomainErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates a DomainError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new DomainError instance with the cause attached
   */
  static override fromError(cause: unknown): DomainError {
    return new DomainError({
      message: cause instanceof Error ? cause.message : 'Domain error',
      cause,
    });
  }
}
