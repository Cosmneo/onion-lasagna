/**
 * @fileoverview Shared types for the event handler system.
 *
 * @module events/shared/types
 */

// ============================================================================
// Event Result
// ============================================================================

/**
 * Result of processing an event.
 *
 * Unlike HTTP responses (which have status codes), event results express
 * the handler's intent for message disposition:
 *
 * - `ack` — Success. Message is acknowledged and removed from the queue.
 * - `retry` — Transient failure. Message should be retried after a delay.
 * - `dlq` — Permanent failure. Message should be sent to the dead-letter queue.
 *
 * @example Success
 * ```typescript
 * return { outcome: 'ack' };
 * ```
 *
 * @example Transient failure (retry after 5 seconds)
 * ```typescript
 * return { outcome: 'retry', reason: 'Database connection timed out', delayMs: 5000 };
 * ```
 *
 * @example Permanent failure (send to DLQ)
 * ```typescript
 * return { outcome: 'dlq', reason: 'Invalid payload: missing ticketId' };
 * ```
 */
export type EventResult =
  | { readonly outcome: 'ack' }
  | { readonly outcome: 'retry'; readonly reason: string; readonly delayMs?: number }
  | { readonly outcome: 'dlq'; readonly reason: string };
