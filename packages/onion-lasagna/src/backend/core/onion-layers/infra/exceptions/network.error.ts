import { ErrorCodes, type InfraErrorCode } from '../../../global/exceptions/error-codes.const';
import { InfraError } from './infra.error';

/**
 * Error thrown when a network operation fails.
 *
 * Indicates connectivity issues such as DNS resolution failures,
 * connection refused, or network unreachable errors.
 *
 * **When to throw:**
 * - Connection refused
 * - DNS resolution failed
 * - Network unreachable
 * - Socket errors
 *
 * @example
 * ```typescript
 * try {
 *   await fetch('https://api.example.com/data');
 * } catch (error) {
 *   throw new NetworkError({
 *     message: 'Failed to connect to API',
 *     code: 'API_CONNECTION_FAILED',
 *     cause: error,
 *   });
 * }
 * ```
 *
 * @extends InfraError
 */
export class NetworkError extends InfraError {
  /**
   * Creates a new NetworkError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of the network failure
   * @param options.code - Machine-readable error code (default: 'NETWORK_ERROR')
   * @param options.cause - Optional underlying network error
   */
  constructor({
    message,
    code = ErrorCodes.Infra.NETWORK_ERROR,
    cause,
  }: {
    message: string;
    code?: InfraErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates a NetworkError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new NetworkError instance with the cause attached
   */
  static override fromError(cause: unknown): NetworkError {
    return new NetworkError({
      message: cause instanceof Error ? cause.message : 'Network error',
      cause,
    });
  }
}
