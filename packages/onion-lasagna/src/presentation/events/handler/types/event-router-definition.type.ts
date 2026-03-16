/**
 * @fileoverview Event router definition types for grouping event handlers.
 *
 * Mirrors the HTTP router definition pattern with hierarchical grouping,
 * dotted-key access, and deep merge support.
 *
 * @module events/handler/types/event-router-definition
 */

import type { EventHandlerDefinition } from './event-handler-definition.type';
import type { SchemaAdapter } from '../../../http/schema/types';

// ============================================================================
// Router Types
// ============================================================================

/**
 * A router entry can be an event handler definition, a nested config, or a router definition.
 */
export type EventRouterEntry =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | EventHandlerDefinition<string, any, any>
  | EventRouterConfig
  | EventRouterDefinition;

/**
 * Configuration for an event router (group of event handlers).
 */
export interface EventRouterConfig {
  readonly [key: string]: EventRouterEntry;
}

/**
 * Router-level defaults applied to all child event handlers.
 */
export interface EventRouterDefaults {
  /** Default tags for all handlers. Merged with handler-specific tags. */
  readonly tags?: readonly string[];

  /** Default context schema. Applied to handlers that don't define their own. */
  readonly context?: SchemaAdapter;
}

/**
 * A fully defined event router.
 */
export interface EventRouterDefinition<T extends EventRouterConfig = EventRouterConfig> {
  /** The handlers and nested routers in this router. */
  readonly handlers: T;

  /** Default values applied to all child handlers. */
  readonly defaults?: EventRouterDefaults;

  /**
   * Marker to identify this as an event router.
   * @internal
   */
  readonly _isEventRouter: true;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Checks if a value is an EventHandlerDefinition.
 */
export function isEventHandlerDefinition(value: unknown): value is EventHandlerDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'eventType' in value &&
    '_types' in value
  );
}

/**
 * Checks if a value is an EventRouterDefinition.
 */
export function isEventRouterDefinition(value: unknown): value is EventRouterDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_isEventRouter' in value &&
    (value as EventRouterDefinition)._isEventRouter === true
  );
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Flattens an event router into a map of dotted keys to handler definitions.
 */
export type FlattenEventRouter<
  T extends EventRouterConfig,
  Prefix extends string = '',
> = T extends EventRouterConfig
  ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [K in keyof T]: T[K] extends EventHandlerDefinition<any, any, any>
        ? { [P in `${Prefix}${K & string}`]: T[K] }
        : T[K] extends EventRouterConfig
          ? FlattenEventRouter<T[K], `${Prefix}${K & string}.`>
          : never;
    }[keyof T] extends infer U
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      U extends Record<string, EventHandlerDefinition<any, any, any>>
      ? U
      : never
    : never
  : never;

/**
 * Gets all handler keys from an event router.
 */
export type EventRouterKeys<
  T extends EventRouterConfig,
  Prefix extends string = '',
> = T extends EventRouterConfig
  ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [K in keyof T]: T[K] extends EventHandlerDefinition<any, any, any>
        ? `${Prefix}${K & string}`
        : T[K] extends EventRouterConfig
          ? EventRouterKeys<T[K], `${Prefix}${K & string}.`>
          : never;
    }[keyof T]
  : never;

/**
 * Gets an event handler by its dotted key path.
 */
export type GetEventHandler<
  T extends EventRouterConfig,
  K extends string,
> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? T[Head] extends EventRouterConfig
      ? GetEventHandler<T[Head], Tail>
      : never
    : never
  : K extends keyof T
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T[K] extends EventHandlerDefinition<any, any, any>
      ? T[K]
      : never
    : never;

// ============================================================================
// Deep Merge Types
// ============================================================================

/**
 * Deep-merges two event router configs at the type level.
 */
export type DeepMergeTwo<A extends EventRouterConfig, B extends EventRouterConfig> = {
  readonly [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] extends EventRouterConfig
        ? B[K] extends EventRouterConfig
          ? DeepMergeTwo<A[K], B[K]>
          : B[K]
        : B[K]
      : A[K]
    : K extends keyof B
      ? B[K]
      : never;
};

/**
 * Recursively deep-merges N event router configs left-to-right.
 */
export type DeepMergeAll<T extends readonly EventRouterConfig[]> = T extends readonly [
  infer Only extends EventRouterConfig,
]
  ? Only
  : T extends readonly [
        infer First extends EventRouterConfig,
        infer Second extends EventRouterConfig,
        ...infer Rest extends readonly EventRouterConfig[],
      ]
    ? DeepMergeAll<[DeepMergeTwo<First, Second>, ...Rest]>
    : EventRouterConfig;

// ============================================================================
// Runtime Utilities
// ============================================================================

/**
 * Collects all event handlers from a router into a flat array.
 */
export function collectEventHandlers(
  config: EventRouterConfig,
  basePath = '',
): { key: string; handler: EventHandlerDefinition }[] {
  const handlers: { key: string; handler: EventHandlerDefinition }[] = [];

  for (const [key, value] of Object.entries(config)) {
    const fullKey = basePath ? `${basePath}.${key}` : key;

    if (isEventHandlerDefinition(value)) {
      handlers.push({ key: fullKey, handler: value });
    } else if (isEventRouterDefinition(value)) {
      handlers.push(...collectEventHandlers(value.handlers, fullKey));
    } else if (typeof value === 'object' && value !== null) {
      handlers.push(...collectEventHandlers(value as EventRouterConfig, fullKey));
    }
  }

  return handlers;
}
