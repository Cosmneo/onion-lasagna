/**
 * @fileoverview Factory function for creating schedule router definitions.
 *
 * The `defineScheduleRouter` function groups scheduled tasks into a hierarchical
 * structure with optional router-level defaults for context and tags.
 *
 * @module schedule/task/define-schedule-router
 */

import type {
  ScheduleRouterConfig,
  ScheduleRouterDefaults,
  ScheduleRouterDefinition,
  ScheduledTaskDefinition,
  DeepMergeTwo,
  DeepMergeAll,
} from './types';
import { isScheduledTaskDefinition, isScheduleRouterDefinition } from './types';

/**
 * Options for schedule router definition.
 */
export interface DefineScheduleRouterOptions {
  /**
   * Default values applied to all child tasks.
   *
   * @example
   * ```typescript
   * defineScheduleRouter({
   *   dailyReconcile: onDailyReconcile,
   *   weeklyDigest: onWeeklyDigest,
   * }, {
   *   defaults: {
   *     context: zodSchema(scheduleMetadataSchema),
   *     tags: ['billing'],
   *   },
   * })
   * ```
   */
  readonly defaults?: ScheduleRouterDefaults;
}

/**
 * Creates a schedule router definition from a configuration object.
 *
 * @param tasks - Object containing scheduled tasks and nested routers
 * @param options - Optional router configuration
 * @returns A frozen ScheduleRouterDefinition object
 *
 * @example Basic router
 * ```typescript
 * const billingSchedules = defineScheduleRouter({
 *   dailyReconcile: onDailyReconcile,
 *   monthlyInvoice: onMonthlyInvoice,
 * });
 * ```
 *
 * @example Nested router
 * ```typescript
 * const schedules = defineScheduleRouter({
 *   billing: {
 *     dailyReconcile: onDailyReconcile,
 *   },
 *   reports: {
 *     weeklyDigest: onWeeklyDigest,
 *   },
 * });
 * ```
 */
export function defineScheduleRouter<T extends ScheduleRouterConfig>(
  tasks: T,
  options?: DefineScheduleRouterOptions,
): ScheduleRouterDefinition<T> {
  const defaults = options?.defaults;

  const processedTasks =
    defaults?.context || defaults?.tags ? (applyScheduleRouterDefaults(tasks, defaults) as T) : tasks;

  const definition: ScheduleRouterDefinition<T> = {
    tasks: processedTasks,
    defaults,
    _isScheduleRouter: true,
  };

  return deepFreeze(definition);
}

/**
 * Recursively applies router-level defaults to all tasks in the tree.
 */
function applyScheduleRouterDefaults(
  tasks: ScheduleRouterConfig,
  defaults: ScheduleRouterDefaults,
): ScheduleRouterConfig {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(tasks)) {
    if (isScheduledTaskDefinition(value)) {
      result[key] = applyDefaultsToScheduledTask(value, defaults);
    } else if (isScheduleRouterDefinition(value)) {
      result[key] = {
        ...value,
        tasks: applyScheduleRouterDefaults(value.tasks, defaults),
      };
    } else if (typeof value === 'object' && value !== null) {
      result[key] = applyScheduleRouterDefaults(value as ScheduleRouterConfig, defaults);
    }
  }

  return result as ScheduleRouterConfig;
}

/**
 * Applies router-level defaults to a single scheduled task definition.
 */
function applyDefaultsToScheduledTask(
  task: ScheduledTaskDefinition,
  defaults: ScheduleRouterDefaults,
): ScheduledTaskDefinition {
  const needsContext = defaults.context && !task.context;
  const needsTags = defaults.tags && defaults.tags.length > 0;

  if (!needsContext && !needsTags) return task;

  return Object.freeze({
    ...task,
    context: task.context ?? defaults.context ?? undefined,
    docs: {
      ...task.docs,
      tags: mergeTags(defaults.tags, task.docs.tags),
    },
  }) as ScheduledTaskDefinition;
}

/**
 * Merges router-level tags with task-level tags, avoiding duplicates.
 */
function mergeTags(
  routerTags?: readonly string[],
  taskTags?: readonly string[],
): readonly string[] | undefined {
  if (!routerTags || routerTags.length === 0) return taskTags;
  if (!taskTags || taskTags.length === 0) return routerTags;

  const merged = [...routerTags];
  for (const tag of taskTags) {
    if (!merged.includes(tag)) {
      merged.push(tag);
    }
  }
  return merged;
}

/**
 * Deep freezes an object and all its nested objects.
 */
function deepFreeze<T extends object>(obj: T): T {
  const propNames = Object.getOwnPropertyNames(obj) as (keyof T)[];

  for (const name of propNames) {
    const value = obj[name];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return Object.freeze(obj);
}

// ============================================================================
// mergeScheduleRouters — variadic deep merge
// ============================================================================

type ScheduleRouterInput<T extends ScheduleRouterConfig> = T | ScheduleRouterDefinition<T>;

/** Extracts the raw ScheduleRouterConfig from either a plain config or a ScheduleRouterDefinition. */
function extractTasks<T extends ScheduleRouterConfig>(input: ScheduleRouterInput<T>): T {
  return isScheduleRouterDefinition(input) ? input.tasks : input;
}

/** Returns true if `value` is a plain sub-router object. */
function isSubRouter(value: unknown): value is ScheduleRouterConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isScheduledTaskDefinition(value) &&
    !isScheduleRouterDefinition(value)
  );
}

/** Recursively deep-merges two router configs. Sub-routers are merged; leaves are overwritten. */
function deepMergeConfigs(a: ScheduleRouterConfig, b: ScheduleRouterConfig): ScheduleRouterConfig {
  const result: Record<string, unknown> = { ...a };

  for (const key of Object.keys(b)) {
    const aVal = result[key];
    const bVal = b[key];

    if (isSubRouter(aVal) && isSubRouter(bVal)) {
      result[key] = deepMergeConfigs(aVal, bVal);
    } else {
      result[key] = bVal;
    }
  }

  return result as ScheduleRouterConfig;
}

// Overloads for 2–8 routers
export function mergeScheduleRouters<T1 extends ScheduleRouterConfig, T2 extends ScheduleRouterConfig>(
  r1: ScheduleRouterInput<T1>,
  r2: ScheduleRouterInput<T2>,
): ScheduleRouterDefinition<DeepMergeTwo<T1, T2>>;
export function mergeScheduleRouters<
  T1 extends ScheduleRouterConfig,
  T2 extends ScheduleRouterConfig,
  T3 extends ScheduleRouterConfig,
>(
  r1: ScheduleRouterInput<T1>,
  r2: ScheduleRouterInput<T2>,
  r3: ScheduleRouterInput<T3>,
): ScheduleRouterDefinition<DeepMergeAll<[T1, T2, T3]>>;
export function mergeScheduleRouters<
  T1 extends ScheduleRouterConfig,
  T2 extends ScheduleRouterConfig,
  T3 extends ScheduleRouterConfig,
  T4 extends ScheduleRouterConfig,
>(
  r1: ScheduleRouterInput<T1>,
  r2: ScheduleRouterInput<T2>,
  r3: ScheduleRouterInput<T3>,
  r4: ScheduleRouterInput<T4>,
): ScheduleRouterDefinition<DeepMergeAll<[T1, T2, T3, T4]>>;
export function mergeScheduleRouters<
  T1 extends ScheduleRouterConfig,
  T2 extends ScheduleRouterConfig,
  T3 extends ScheduleRouterConfig,
  T4 extends ScheduleRouterConfig,
  T5 extends ScheduleRouterConfig,
>(
  r1: ScheduleRouterInput<T1>,
  r2: ScheduleRouterInput<T2>,
  r3: ScheduleRouterInput<T3>,
  r4: ScheduleRouterInput<T4>,
  r5: ScheduleRouterInput<T5>,
): ScheduleRouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5]>>;
export function mergeScheduleRouters<
  T1 extends ScheduleRouterConfig,
  T2 extends ScheduleRouterConfig,
  T3 extends ScheduleRouterConfig,
  T4 extends ScheduleRouterConfig,
  T5 extends ScheduleRouterConfig,
  T6 extends ScheduleRouterConfig,
>(
  r1: ScheduleRouterInput<T1>,
  r2: ScheduleRouterInput<T2>,
  r3: ScheduleRouterInput<T3>,
  r4: ScheduleRouterInput<T4>,
  r5: ScheduleRouterInput<T5>,
  r6: ScheduleRouterInput<T6>,
): ScheduleRouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5, T6]>>;
export function mergeScheduleRouters<
  T1 extends ScheduleRouterConfig,
  T2 extends ScheduleRouterConfig,
  T3 extends ScheduleRouterConfig,
  T4 extends ScheduleRouterConfig,
  T5 extends ScheduleRouterConfig,
  T6 extends ScheduleRouterConfig,
  T7 extends ScheduleRouterConfig,
>(
  r1: ScheduleRouterInput<T1>,
  r2: ScheduleRouterInput<T2>,
  r3: ScheduleRouterInput<T3>,
  r4: ScheduleRouterInput<T4>,
  r5: ScheduleRouterInput<T5>,
  r6: ScheduleRouterInput<T6>,
  r7: ScheduleRouterInput<T7>,
): ScheduleRouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5, T6, T7]>>;
export function mergeScheduleRouters<
  T1 extends ScheduleRouterConfig,
  T2 extends ScheduleRouterConfig,
  T3 extends ScheduleRouterConfig,
  T4 extends ScheduleRouterConfig,
  T5 extends ScheduleRouterConfig,
  T6 extends ScheduleRouterConfig,
  T7 extends ScheduleRouterConfig,
  T8 extends ScheduleRouterConfig,
>(
  r1: ScheduleRouterInput<T1>,
  r2: ScheduleRouterInput<T2>,
  r3: ScheduleRouterInput<T3>,
  r4: ScheduleRouterInput<T4>,
  r5: ScheduleRouterInput<T5>,
  r6: ScheduleRouterInput<T6>,
  r7: ScheduleRouterInput<T7>,
  r8: ScheduleRouterInput<T8>,
): ScheduleRouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5, T6, T7, T8]>>;

// Variadic fallback for 9+
export function mergeScheduleRouters(
  ...routers: ScheduleRouterInput<ScheduleRouterConfig>[]
): ScheduleRouterDefinition<ScheduleRouterConfig>;

// Implementation
export function mergeScheduleRouters(
  ...routers: ScheduleRouterInput<ScheduleRouterConfig>[]
): ScheduleRouterDefinition<ScheduleRouterConfig> {
  const merged = routers.map(extractTasks).reduce(deepMergeConfigs);
  return defineScheduleRouter(merged);
}
