import { InfraError } from './infra.error';

/**
 * Error thrown when a third-party service call fails.
 *
 * Wraps errors from external APIs, payment gateways, email services,
 * or any other third-party dependency.
 *
 * **When to throw:**
 * - Third-party API returns an error
 * - External service is unavailable
 * - Unexpected response from external service
 * - Rate limiting by external service
 *
 * @example
 * ```typescript
 * try {
 *   await this.paymentGateway.charge(amount);
 * } catch (error) {
 *   throw new ExternalServiceError({
 *     message: 'Payment gateway charge failed',
 *     code: 'PAYMENT_GATEWAY_ERROR',
 *     cause: error,
 *   });
 * }
 * ```
 *
 * @extends InfraError
 */
export class ExternalServiceError extends InfraError {
  /**
   * Creates a new ExternalServiceError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of the external service failure
   * @param options.code - Machine-readable error code (default: 'EXTERNAL_SERVICE_ERROR')
   * @param options.cause - Optional underlying service error
   */
  constructor({
    message,
    code = 'EXTERNAL_SERVICE_ERROR',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates an ExternalServiceError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new ExternalServiceError instance with the cause attached
   */
  static override fromError(cause: unknown): ExternalServiceError {
    return new ExternalServiceError({
      message: cause instanceof Error ? cause.message : 'External service error',
      cause,
    });
  }
}
