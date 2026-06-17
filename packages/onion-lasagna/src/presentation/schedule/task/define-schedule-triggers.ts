/**
 * @fileoverview Factory function for creating schedule trigger maps.
 *
 * A trigger binds a task `type` to a timing expression (cron or rate). Triggers
 * are the WHEN/HOW binding and are kept SEPARATE from the task contract so the
 * same task can be wired to different triggers per deployment.
 *
 * @module schedule/task/define-schedule-triggers
 */

import type { ScheduleTriggerMap } from './types';

/**
 * Creates a frozen trigger map from a triggerId → trigger configuration object.
 *
 * Each trigger is keyed by a stable `triggerId` (deployment-chosen). The
 * runtime uses the `triggerId` to derive a recurring run's idempotency key
 * (`${triggerId}:${scheduledFor}`).
 *
 * @param triggers - Map of triggerId → ScheduleTrigger
 * @returns A frozen ScheduleTriggerMap
 *
 * @example
 * ```typescript
 * const triggers = defineScheduleTriggers({
 *   nightlyReconcile: { type: 'billing.dailyReconcile', cron: '0 2 * * *', timezone: 'UTC' },
 *   healthPing: { type: 'ops.healthPing', rate: 'rate(5 minutes)' },
 * });
 * ```
 */
export function defineScheduleTriggers<T extends ScheduleTriggerMap>(triggers: T): Readonly<T> {
  for (const [triggerId, value] of Object.entries(triggers)) {
    // A trigger must have EXACTLY ONE timing expression — cron OR rate.
    const t = value as { cron?: unknown; rate?: unknown };
    const hasCron = t.cron !== undefined;
    const hasRate = t.rate !== undefined;
    if (hasCron === hasRate) {
      throw new Error(
        `Schedule trigger "${triggerId}" must have exactly one of 'cron' or 'rate' ` +
          `(got ${hasCron ? 'both' : 'neither'}).`,
      );
    }
    // Freeze each trigger as well as the outer map for full immutability.
    Object.freeze(value);
  }
  return Object.freeze({ ...triggers }) as Readonly<T>;
}
