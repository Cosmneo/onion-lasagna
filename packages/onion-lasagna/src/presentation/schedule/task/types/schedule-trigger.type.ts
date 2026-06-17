/**
 * @fileoverview Schedule trigger types — the WHEN/HOW binding.
 *
 * A trigger binds a task `type` to a timing expression (a cron expression for
 * recurring work, or a rate expression for fixed-interval work). Triggers are
 * deployment-facing and kept deliberately SEPARATE from the task contract
 * (`ScheduledTaskDefinition`) so the same task can be wired to different
 * triggers per environment.
 *
 * @module schedule/task/types/schedule-trigger
 */

// ============================================================================
// Trigger Types
// ============================================================================

/**
 * A cron-based trigger (recurring work on a cron expression).
 */
export interface CronScheduleTrigger {
  /** The task `type` this trigger fires. */
  readonly type: string;

  /** Cron expression (e.g., '0 2 * * *' for daily at 02:00). */
  readonly cron: string;

  /** A cron trigger is never also a rate trigger (mutually exclusive). */
  readonly rate?: never;

  /** Optional timezone (e.g., 'Europe/Lisbon'). Provider-dependent. */
  readonly timezone?: string;
}

/**
 * A rate-based trigger (fixed-interval recurring work).
 */
export interface RateScheduleTrigger {
  /** The task `type` this trigger fires. */
  readonly type: string;

  /** Rate expression (e.g., 'rate(5 minutes)' or '5m' — provider-dependent). */
  readonly rate: string;

  /** A rate trigger is never also a cron trigger (mutually exclusive). */
  readonly cron?: never;

  /** Optional timezone. Provider-dependent. */
  readonly timezone?: string;
}

/**
 * A schedule trigger — either cron-based or rate-based.
 *
 * This is the WHEN/HOW binding for a scheduled task. It is intentionally kept
 * separate from the task contract.
 */
export type ScheduleTrigger = CronScheduleTrigger | RateScheduleTrigger;

/**
 * A frozen map of triggerId → trigger.
 *
 * The `triggerId` is a stable, deployment-chosen key. It is what the runtime
 * uses to build a recurring run's idempotency key (`${triggerId}:${scheduledFor}`).
 */
export type ScheduleTriggerMap = Readonly<Record<string, ScheduleTrigger>>;

// ============================================================================
// Type Guards
// ============================================================================

/** Returns true if the trigger is cron-based. */
export function isCronScheduleTrigger(trigger: ScheduleTrigger): trigger is CronScheduleTrigger {
  return 'cron' in trigger && typeof (trigger as CronScheduleTrigger).cron === 'string';
}

/** Returns true if the trigger is rate-based. */
export function isRateScheduleTrigger(trigger: ScheduleTrigger): trigger is RateScheduleTrigger {
  return 'rate' in trigger && typeof (trigger as RateScheduleTrigger).rate === 'string';
}
