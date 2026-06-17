/**
 * @fileoverview Schedule router definition types for grouping scheduled tasks.
 *
 * Mirrors the event router definition pattern with hierarchical grouping,
 * dotted-key access, and deep merge support.
 *
 * @module schedule/task/types/schedule-router-definition
 */

import type { ScheduledTaskDefinition } from './scheduled-task-definition.type';
import type { SchemaAdapter } from '../../../http/schema/types';

// ============================================================================
// Router Types
// ============================================================================

/**
 * A router entry can be a scheduled task definition, a nested config, or a router definition.
 */
export type ScheduleRouterEntry =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ScheduledTaskDefinition<string, any, any> | ScheduleRouterConfig | ScheduleRouterDefinition;

/**
 * Configuration for a schedule router (group of scheduled tasks).
 */
export interface ScheduleRouterConfig {
  readonly [key: string]: ScheduleRouterEntry;
}

/**
 * Router-level defaults applied to all child scheduled tasks.
 */
export interface ScheduleRouterDefaults {
  /** Default tags for all tasks. Merged with task-specific tags. */
  readonly tags?: readonly string[];

  /** Default context schema. Applied to tasks that don't define their own. */
  readonly context?: SchemaAdapter;
}

/**
 * A fully defined schedule router.
 */
export interface ScheduleRouterDefinition<T extends ScheduleRouterConfig = ScheduleRouterConfig> {
  /** The tasks and nested routers in this router. */
  readonly tasks: T;

  /** Default values applied to all child tasks. */
  readonly defaults?: ScheduleRouterDefaults;

  /**
   * Marker to identify this as a schedule router.
   * @internal
   */
  readonly _isScheduleRouter: true;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Checks if a value is a ScheduledTaskDefinition.
 */
export function isScheduledTaskDefinition(value: unknown): value is ScheduledTaskDefinition {
  return typeof value === 'object' && value !== null && 'type' in value && '_types' in value;
}

/**
 * Checks if a value is a ScheduleRouterDefinition.
 */
export function isScheduleRouterDefinition(value: unknown): value is ScheduleRouterDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_isScheduleRouter' in value &&
    (value as ScheduleRouterDefinition)._isScheduleRouter === true
  );
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Flattens a schedule router into a map of dotted keys to task definitions.
 */
export type FlattenScheduleRouter<
  T extends ScheduleRouterConfig,
  Prefix extends string = '',
> = T extends ScheduleRouterConfig
  ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [K in keyof T]: T[K] extends ScheduledTaskDefinition<any, any, any>
        ? { [P in `${Prefix}${K & string}`]: T[K] }
        : T[K] extends ScheduleRouterConfig
          ? FlattenScheduleRouter<T[K], `${Prefix}${K & string}.`>
          : never;
    }[keyof T] extends infer U
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      U extends Record<string, ScheduledTaskDefinition<any, any, any>>
      ? U
      : never
    : never
  : never;

/**
 * Gets all task keys from a schedule router.
 */
export type ScheduleRouterKeys<
  T extends ScheduleRouterConfig,
  Prefix extends string = '',
> = T extends ScheduleRouterConfig
  ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [K in keyof T]: T[K] extends ScheduledTaskDefinition<any, any, any>
        ? `${Prefix}${K & string}`
        : T[K] extends ScheduleRouterConfig
          ? ScheduleRouterKeys<T[K], `${Prefix}${K & string}.`>
          : never;
    }[keyof T]
  : never;

/**
 * Gets a scheduled task by its dotted key path.
 */
export type GetScheduledTask<
  T extends ScheduleRouterConfig,
  K extends string,
> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? T[Head] extends ScheduleRouterConfig
      ? GetScheduledTask<T[Head], Tail>
      : never
    : never
  : K extends keyof T
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T[K] extends ScheduledTaskDefinition<any, any, any>
      ? T[K]
      : never
    : never;

// ============================================================================
// Deep Merge Types
// ============================================================================

/**
 * Deep-merges two schedule router configs at the type level.
 */
export type DeepMergeTwo<A extends ScheduleRouterConfig, B extends ScheduleRouterConfig> = {
  readonly [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] extends ScheduleRouterConfig
        ? B[K] extends ScheduleRouterConfig
          ? DeepMergeTwo<A[K], B[K]>
          : B[K]
        : B[K]
      : A[K]
    : K extends keyof B
      ? B[K]
      : never;
};

/**
 * Recursively deep-merges N schedule router configs left-to-right.
 */
export type DeepMergeAll<T extends readonly ScheduleRouterConfig[]> = T extends readonly [
  infer Only extends ScheduleRouterConfig,
]
  ? Only
  : T extends readonly [
        infer First extends ScheduleRouterConfig,
        infer Second extends ScheduleRouterConfig,
        ...infer Rest extends readonly ScheduleRouterConfig[],
      ]
    ? DeepMergeAll<[DeepMergeTwo<First, Second>, ...Rest]>
    : ScheduleRouterConfig;

// ============================================================================
// Runtime Utilities
// ============================================================================

/**
 * Collects all scheduled tasks from a router into a flat array.
 */
export function collectScheduledTasks(
  config: ScheduleRouterConfig,
  basePath = '',
): { key: string; task: ScheduledTaskDefinition }[] {
  const tasks: { key: string; task: ScheduledTaskDefinition }[] = [];

  for (const [key, value] of Object.entries(config)) {
    const fullKey = basePath ? `${basePath}.${key}` : key;

    if (isScheduledTaskDefinition(value)) {
      tasks.push({ key: fullKey, task: value });
    } else if (isScheduleRouterDefinition(value)) {
      tasks.push(...collectScheduledTasks(value.tasks, fullKey));
    } else if (typeof value === 'object' && value !== null) {
      tasks.push(...collectScheduledTasks(value as ScheduleRouterConfig, fullKey));
    }
  }

  return tasks;
}
