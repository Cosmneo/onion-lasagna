/**
 * @fileoverview Shared types for the scheduled task system.
 *
 * @module schedule/shared/types
 */

// ============================================================================
// Schedule Result
// ============================================================================

/**
 * Result of running a scheduled task.
 *
 * Unlike event results (ack/retry/dlq) or HTTP responses (status codes),
 * a schedule result expresses the outcome of a *run*:
 *
 * - `completed` — Success. The run did its work (or correctly determined there
 *   was nothing to do but still counts as a healthy completion).
 * - `skipped` — Nothing was due / no work to perform. This is an EXPLICIT,
 *   intentional signal returned by explicit pipeline code (a handler,
 *   resultMapper, or middleware). It is NEVER produced by error mapping — a
 *   validation or domain failure is a `failed`, not a `skipped`.
 * - `retry` — Transient failure. The run should be retried (the `delayMs` is
 *   an advisory hint; retry COUNT/backoff is the delivery layer's concern).
 * - `failed` — Permanent failure. Retrying will not help (bad payload, domain
 *   invariant, permission). `errorType` carries the classified error name.
 *
 * @example Success
 * ```typescript
 * return { outcome: 'completed' };
 * ```
 *
 * @example Nothing due
 * ```typescript
 * return { outcome: 'skipped', reason: 'No invoices pending reconciliation' };
 * ```
 *
 * @example Transient failure (retry, advisory 5s delay)
 * ```typescript
 * return { outcome: 'retry', reason: 'Database connection timed out', delayMs: 5000 };
 * ```
 *
 * @example Permanent failure
 * ```typescript
 * return { outcome: 'failed', reason: 'Invalid payload: missing tenantId', errorType: 'ObjectValidationError' };
 * ```
 */
export type ScheduleResult =
  | { readonly outcome: 'completed' }
  | { readonly outcome: 'skipped'; readonly reason: string }
  | { readonly outcome: 'retry'; readonly reason: string; readonly delayMs?: number }
  | { readonly outcome: 'failed'; readonly reason: string; readonly errorType?: string };
