import type { RetryBackoff } from './interfaces';

/**
 * Creates an exponential backoff function with jitter.
 *
 * Each attempt doubles the delay (clamped between min and max),
 * then adds uniform random jitter to spread retries and avoid
 * thundering herd.
 *
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 * @returns A backoff function compatible with `IRetryPolicy.backoffMs`
 *
 * @example
 * ```typescript
 * createSaga<Ctx>()
 *   .step('charge', chargeCard, refundCard, {
 *     retry: { maxAttempts: 5, backoffMs: exponentialBackoff(200, 5000) },
 *   })
 * ```
 */
export function exponentialBackoff(minMs: number, maxMs: number): RetryBackoff {
  return (attempt: number) => {
    const exponential = minMs * 2 ** (attempt - 1);
    const clamped = Math.min(exponential, maxMs);
    const jitter = Math.random() * clamped;
    return Math.floor(clamped + jitter);
  };
}
