/**
 * @fileoverview Types for the schedule catalog (a serializable inventory of
 * scheduled tasks + their trigger bindings).
 *
 * @module schedule/catalog/types
 */

import type { ScheduledTaskDefinition } from '../task/types';

/** A scheduled task as it appears in the catalog inventory. */
export interface ScheduleTaskCatalogEntry {
  /** The task type (routing key). */
  readonly type: string;
  /** The dotted router key the task was registered under. */
  readonly key: string;
  /** Whether the task declares a payload schema. */
  readonly hasPayload: boolean;
  /** Whether the task declares a context schema. */
  readonly hasContext: boolean;
  /** The task's documentation metadata. */
  readonly docs: ScheduledTaskDefinition['docs'];
}

/** A trigger binding as it appears in the catalog inventory. */
export interface ScheduleTriggerCatalogEntry {
  /** The stable, deployment-chosen trigger id. */
  readonly triggerId: string;
  /** The task type this trigger fires. */
  readonly type: string;
  /** Cron expression (present for cron triggers). */
  readonly cron?: string;
  /** Rate expression (present for rate triggers). */
  readonly rate?: string;
  /** Optional timezone. */
  readonly timezone?: string;
}

/** A serializable inventory of a schedule router + its triggers. */
export interface ScheduleCatalog {
  readonly tasks: readonly ScheduleTaskCatalogEntry[];
  readonly triggers: readonly ScheduleTriggerCatalogEntry[];
}
