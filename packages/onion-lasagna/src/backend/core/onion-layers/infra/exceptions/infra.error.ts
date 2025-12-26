import { CodedError } from '../../../global/exceptions/coded-error.error';
import { ErrorCodes, type InfraErrorCode } from '../../../global/exceptions/error-codes.const';

/**
 * Base error class for infrastructure layer failures.
 *
 * Infrastructure errors represent failures in external dependencies
 * such as databases, network services, file systems, or third-party APIs.
 * They are automatically created by {@link BaseOutboundAdapter} when
 * repository or gateway methods fail.
 *
 * **When to throw:**
 * - Database connection or query failures
 * - Network timeouts or connection errors
 * - External API failures
 * - File system errors
 *
 * **Child classes:**
 * - {@link DbError} - Database operation failures
 * - {@link NetworkError} - Network connectivity issues
 * - {@link TimeoutError} - Operation timeout
 * - {@link ExternalServiceError} - Third-party service failures
 *
 * @example
 * ```typescript
 * // In a repository extending BaseOutboundAdapter
 * protected override createInfraError(error: unknown, methodName: string): InfraError {
 *   return new DbError({
 *     message: `Database error in ${methodName}`,
 *     cause: error,
 *   });
 * }
 * ```
 */
export class InfraError extends CodedError {
  /**
   * Creates a new InfraError instance.
   *
   * @param options - Error configuration
   * @param options.message - Human-readable error description
   * @param options.code - Machine-readable error code (default: 'INFRA_ERROR')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.Infra.INFRA_ERROR,
    cause,
  }: {
    message: string;
    code?: InfraErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates an InfraError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new InfraError instance with the cause attached
   */
  static override fromError(cause: unknown): InfraError {
    return new InfraError({
      message: cause instanceof Error ? cause.message : 'Infrastructure error',
      cause,
    });
  }
}
