/**
 * @fileoverview Schedule catalog generator.
 *
 * Builds a serializable inventory of a schedule router's tasks + their trigger
 * bindings, and validates their consistency. This is intentionally NOT a full
 * AsyncAPI-style document — it is a minimal, validated manifest that catches
 * wiring mistakes (duplicate task types, triggers pointing at unknown tasks)
 * and makes test harnesses / provider registration easy to build.
 *
 * Note: a `ScheduleTriggerMap` is a plain object keyed by `triggerId`, so
 * duplicate trigger ids are structurally impossible and need no check here.
 *
 * @module schedule/catalog/generate
 */

import {
  collectScheduledTasks,
  isScheduleRouterDefinition,
  isCronScheduleTrigger,
} from '../task/types';
import type {
  ScheduleRouterConfig,
  ScheduleRouterDefinition,
  ScheduleTriggerMap,
} from '../task/types';
import type {
  ScheduleCatalog,
  ScheduleTaskCatalogEntry,
  ScheduleTriggerCatalogEntry,
} from './types';

/**
 * Generates a validated catalog from a schedule router (and optional triggers).
 *
 * @param router - A schedule router config or definition.
 * @param triggers - Optional trigger map (output of `defineScheduleTriggers`).
 * @returns The serializable catalog inventory.
 * @throws {Error} On a duplicate task `type`, or a trigger whose `type` has no
 *   registered task.
 */
export function generateScheduleCatalog(
  router: ScheduleRouterConfig | ScheduleRouterDefinition,
  triggers: ScheduleTriggerMap = {},
): ScheduleCatalog {
  const config = isScheduleRouterDefinition(router) ? router.tasks : router;
  const collected = collectScheduledTasks(config);

  const seenTypes = new Set<string>();
  const tasks: ScheduleTaskCatalogEntry[] = collected.map(({ key, task }) => {
    if (seenTypes.has(task.type)) {
      throw new Error(
        `Duplicate scheduled task type "${task.type}" in catalog: each task type must be unique.`,
      );
    }
    seenTypes.add(task.type);
    return {
      type: task.type,
      key,
      hasPayload: task.payload !== undefined,
      hasContext: task.context !== undefined,
      docs: task.docs,
    };
  });

  const triggerCatalog: ScheduleTriggerCatalogEntry[] = Object.entries(triggers).map(
    ([triggerId, trigger]) => {
      if (!seenTypes.has(trigger.type)) {
        throw new Error(
          `Schedule trigger "${triggerId}" references unknown task type "${trigger.type}": ` +
            `no task with that type is registered in the router.`,
        );
      }
      const timezone = trigger.timezone ? { timezone: trigger.timezone } : {};
      return isCronScheduleTrigger(trigger)
        ? { triggerId, type: trigger.type, cron: trigger.cron, ...timezone }
        : { triggerId, type: trigger.type, rate: trigger.rate, ...timezone };
    },
  );

  return { tasks, triggers: triggerCatalog };
}
