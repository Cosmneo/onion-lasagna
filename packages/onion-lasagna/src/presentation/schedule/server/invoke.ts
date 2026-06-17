/**
 * @fileoverview Invocation PRIMITIVES for scheduled tasks.
 *
 * These are deliberately NOT a fan-out dispatcher. A scheduled run targets a
 * single task `type` (one task per type — fan-out is modeled as distinct
 * types/triggers, not multiple handlers on one type). The primitives let an
 * app/infra adapter index, look up, and invoke the right task for a raw run,
 * and resolve a trigger binding.
 *
 * @module schedule/server/invoke
 */

import type { ScheduleTrigger, ScheduleTriggerMap } from '../task/types';
import { isCronScheduleTrigger, isRateScheduleTrigger } from '../task/types';
import type { ScheduleResult } from '../shared/types';
import type { RawSchedule, UnifiedScheduleInput } from './types';

/**
 * Indexes schedule routes by their task `type` for O(1) lookup.
 *
 * Throws on a DUPLICATE `type`: a single type must map to exactly one task.
 * This enforces the "one task per type — no fan-out" rule at the boundary.
 *
 * @param routes - The schedule routes (output of scheduleRoutes().build()).
 * @returns A Map keyed by task type.
 * @throws {Error} If two routes share the same `type`.
 */
export function indexScheduleRoutes(
  routes: readonly UnifiedScheduleInput[],
): Map<string, UnifiedScheduleInput> {
  const index = new Map<string, UnifiedScheduleInput>();

  for (const route of routes) {
    if (index.has(route.type)) {
      throw new Error(
        `Duplicate scheduled task type "${route.type}": exactly one task may be registered ` +
          `per type. Fan-out is not supported — model multiple jobs as distinct types/triggers.`,
      );
    }
    index.set(route.type, route);
  }

  return index;
}

/**
 * Finds a single schedule route by its task `type`.
 *
 * @param routes - The schedule routes to search.
 * @param type - The task type to find.
 * @returns The matching route, or `undefined` if none matches.
 */
export function findScheduleRoute(
  routes: readonly UnifiedScheduleInput[],
  type: string,
): UnifiedScheduleInput | undefined {
  return routes.find((route) => route.type === type);
}

/**
 * Invokes the scheduled task matching `raw.type`.
 *
 * If no task is registered for the type, returns a `failed` result rather than
 * throwing — a misrouted run is a permanent failure, not a transient one.
 *
 * @param routes - The schedule routes (output of scheduleRoutes().build()).
 * @param raw - The raw schedule run from the provider.
 * @returns The ScheduleResult from the task handler (or a `failed` miss result).
 */
export async function invokeScheduledTask(
  routes: readonly UnifiedScheduleInput[],
  raw: RawSchedule,
): Promise<ScheduleResult> {
  const route = findScheduleRoute(routes, raw.type);

  if (!route) {
    return {
      outcome: 'failed',
      reason: `No scheduled task for type "${raw.type}".`,
    };
  }

  return route.handler(raw);
}

/**
 * Resolves a trigger from a trigger map by a lookup `key`.
 *
 * Lookup precedence:
 *  1. Direct `triggerId` key match (the common case — providers that carry the
 *     stable triggerId).
 *  2. Fallback: match by timing expression — a trigger whose `cron` or `rate`
 *     equals `key` (for providers keyed by the raw cron/rate expression rather
 *     than by triggerId). The first trigger (in insertion order) whose
 *     expression matches is returned.
 *
 * @param triggers - The trigger map (output of defineScheduleTriggers).
 * @param key - A triggerId, or a cron/rate expression.
 * @returns The matching trigger, or `undefined` if none matches.
 */
export function resolveScheduleTrigger(
  triggers: ScheduleTriggerMap,
  key: string,
): ScheduleTrigger | undefined {
  // 1. Direct triggerId match.
  const byId = triggers[key];
  if (byId) return byId;

  // 2. Fallback: match by cron/rate expression.
  for (const trigger of Object.values(triggers)) {
    if (isCronScheduleTrigger(trigger) && trigger.cron === key) return trigger;
    if (isRateScheduleTrigger(trigger) && trigger.rate === key) return trigger;
  }

  return undefined;
}
