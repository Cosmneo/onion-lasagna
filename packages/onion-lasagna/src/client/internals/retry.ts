import type { RetryConfig } from '../types';
import { ClientError } from '../types';

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  attempts: 3,
  delay: 1000,
  backoff: 'exponential',
  retryOn: (error: ClientError) => error.shouldRetry(),
};

/**
 * Calculate the delay for a retry attempt.
 *
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const baseDelay = config.delay;
  const backoff = config.backoff ?? 'exponential';

  if (backoff === 'linear') {
    return baseDelay;
  }

  // Exponential backoff: delay * 2^(attempt-1)
  return baseDelay * Math.pow(2, attempt - 1);
}

/**
 * Determine if a request should be retried.
 *
 * @param error - The error that occurred
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @returns Whether the request should be retried
 */
export function shouldRetry(error: ClientError, attempt: number, config: RetryConfig): boolean {
  // Check if we've exceeded the maximum attempts
  if (attempt >= config.attempts) {
    return false;
  }

  // Use custom retry function if provided
  const retryOn = config.retryOn ?? DEFAULT_RETRY_CONFIG.retryOn;
  return retryOn(error, attempt);
}

/**
 * Wait for the specified delay.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic.
 *
 * @param fn - The function to execute
 * @param config - Retry configuration
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig,
): Promise<T> {
  const mergedConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: ClientError | undefined;
  let attempt = 0;

  while (attempt < mergedConfig.attempts) {
    attempt++;

    try {
      return await fn();
    } catch (error) {
      // Ensure error is a ClientError
      lastError =
        error instanceof ClientError
          ? error
          : ClientError.networkError(
              error instanceof Error ? error.message : 'Unknown error',
              error instanceof Error ? error : undefined,
            );

      // Check if we should retry
      if (!shouldRetry(lastError, attempt, mergedConfig)) {
        throw lastError;
      }

      // Wait before retrying
      const delay = calculateRetryDelay(attempt, mergedConfig);
      await wait(delay);
    }
  }

  // This should never be reached, but TypeScript doesn't know that
  throw lastError ?? new ClientError('Retry failed', 0);
}
