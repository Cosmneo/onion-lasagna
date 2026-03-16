/**
 * @fileoverview Factory function for creating event router definitions.
 *
 * The `defineEventRouter` function groups event handlers into a hierarchical
 * structure with optional router-level defaults for context and tags.
 *
 * @module events/handler/define-event-router
 */

import type {
  EventRouterConfig,
  EventRouterDefaults,
  EventRouterDefinition,
  EventHandlerDefinition,
  DeepMergeTwo,
  DeepMergeAll,
} from './types';
import { isEventHandlerDefinition, isEventRouterDefinition } from './types';

/**
 * Options for event router definition.
 */
export interface DefineEventRouterOptions {
  /**
   * Default values applied to all child handlers.
   *
   * @example
   * ```typescript
   * defineEventRouter({
   *   created: onTicketCreated,
   *   assigned: onTicketAssigned,
   * }, {
   *   defaults: {
   *     context: zodSchema(eventMetadataSchema),
   *     tags: ['ticket'],
   *   },
   * })
   * ```
   */
  readonly defaults?: EventRouterDefaults;
}

/**
 * Creates an event router definition from a configuration object.
 *
 * @param handlers - Object containing event handlers and nested routers
 * @param options - Optional router configuration
 * @returns A frozen EventRouterDefinition object
 *
 * @example Basic router
 * ```typescript
 * const ticketEvents = defineEventRouter({
 *   created: onTicketCreated,
 *   assigned: onTicketAssigned,
 *   transferred: onTicketTransferred,
 * });
 * ```
 *
 * @example Nested router
 * ```typescript
 * const events = defineEventRouter({
 *   ticket: {
 *     created: onTicketCreated,
 *     assigned: onTicketAssigned,
 *   },
 *   ecosystem: {
 *     memberAdded: onMemberAdded,
 *   },
 * });
 * ```
 */
export function defineEventRouter<T extends EventRouterConfig>(
  handlers: T,
  options?: DefineEventRouterOptions,
): EventRouterDefinition<T> {
  const defaults = options?.defaults;

  const processedHandlers =
    defaults?.context || defaults?.tags
      ? (applyEventRouterDefaults(handlers, defaults) as T)
      : handlers;

  const definition: EventRouterDefinition<T> = {
    handlers: processedHandlers,
    defaults,
    _isEventRouter: true,
  };

  return deepFreeze(definition);
}

/**
 * Recursively applies router-level defaults to all handlers in the tree.
 */
function applyEventRouterDefaults(
  handlers: EventRouterConfig,
  defaults: EventRouterDefaults,
): EventRouterConfig {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(handlers)) {
    if (isEventHandlerDefinition(value)) {
      result[key] = applyDefaultsToEventHandler(value, defaults);
    } else if (isEventRouterDefinition(value)) {
      result[key] = {
        ...value,
        handlers: applyEventRouterDefaults(value.handlers, defaults),
      };
    } else if (typeof value === 'object' && value !== null) {
      result[key] = applyEventRouterDefaults(value as EventRouterConfig, defaults);
    }
  }

  return result as EventRouterConfig;
}

/**
 * Applies router-level defaults to a single event handler definition.
 */
function applyDefaultsToEventHandler(
  handler: EventHandlerDefinition,
  defaults: EventRouterDefaults,
): EventHandlerDefinition {
  const needsContext = defaults.context && !handler.context;
  const needsTags = defaults.tags && defaults.tags.length > 0;

  if (!needsContext && !needsTags) return handler;

  return Object.freeze({
    ...handler,
    context: handler.context ?? defaults.context ?? undefined,
    docs: {
      ...handler.docs,
      tags: mergeTags(defaults.tags, handler.docs.tags),
    },
  }) as EventHandlerDefinition;
}

/**
 * Merges router-level tags with handler-level tags, avoiding duplicates.
 */
function mergeTags(
  routerTags?: readonly string[],
  handlerTags?: readonly string[],
): readonly string[] | undefined {
  if (!routerTags || routerTags.length === 0) return handlerTags;
  if (!handlerTags || handlerTags.length === 0) return routerTags;

  const merged = [...routerTags];
  for (const tag of handlerTags) {
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
// mergeEventRouters — variadic deep merge
// ============================================================================

type EventRouterInput<T extends EventRouterConfig> = T | EventRouterDefinition<T>;

/** Extracts the raw EventRouterConfig from either a plain config or an EventRouterDefinition. */
function extractHandlers<T extends EventRouterConfig>(input: EventRouterInput<T>): T {
  return isEventRouterDefinition(input) ? input.handlers : input;
}

/** Returns true if `value` is a plain sub-router object. */
function isSubRouter(value: unknown): value is EventRouterConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isEventHandlerDefinition(value) &&
    !isEventRouterDefinition(value)
  );
}

/** Recursively deep-merges two router configs. Sub-routers are merged; leaves are overwritten. */
function deepMergeConfigs(a: EventRouterConfig, b: EventRouterConfig): EventRouterConfig {
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

  return result as EventRouterConfig;
}

// Overloads for 2–8 routers
export function mergeEventRouters<T1 extends EventRouterConfig, T2 extends EventRouterConfig>(
  r1: EventRouterInput<T1>,
  r2: EventRouterInput<T2>,
): EventRouterDefinition<DeepMergeTwo<T1, T2>>;
export function mergeEventRouters<
  T1 extends EventRouterConfig,
  T2 extends EventRouterConfig,
  T3 extends EventRouterConfig,
>(
  r1: EventRouterInput<T1>,
  r2: EventRouterInput<T2>,
  r3: EventRouterInput<T3>,
): EventRouterDefinition<DeepMergeAll<[T1, T2, T3]>>;
export function mergeEventRouters<
  T1 extends EventRouterConfig,
  T2 extends EventRouterConfig,
  T3 extends EventRouterConfig,
  T4 extends EventRouterConfig,
>(
  r1: EventRouterInput<T1>,
  r2: EventRouterInput<T2>,
  r3: EventRouterInput<T3>,
  r4: EventRouterInput<T4>,
): EventRouterDefinition<DeepMergeAll<[T1, T2, T3, T4]>>;
export function mergeEventRouters<
  T1 extends EventRouterConfig,
  T2 extends EventRouterConfig,
  T3 extends EventRouterConfig,
  T4 extends EventRouterConfig,
  T5 extends EventRouterConfig,
>(
  r1: EventRouterInput<T1>,
  r2: EventRouterInput<T2>,
  r3: EventRouterInput<T3>,
  r4: EventRouterInput<T4>,
  r5: EventRouterInput<T5>,
): EventRouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5]>>;
export function mergeEventRouters<
  T1 extends EventRouterConfig,
  T2 extends EventRouterConfig,
  T3 extends EventRouterConfig,
  T4 extends EventRouterConfig,
  T5 extends EventRouterConfig,
  T6 extends EventRouterConfig,
>(
  r1: EventRouterInput<T1>,
  r2: EventRouterInput<T2>,
  r3: EventRouterInput<T3>,
  r4: EventRouterInput<T4>,
  r5: EventRouterInput<T5>,
  r6: EventRouterInput<T6>,
): EventRouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5, T6]>>;
export function mergeEventRouters<
  T1 extends EventRouterConfig,
  T2 extends EventRouterConfig,
  T3 extends EventRouterConfig,
  T4 extends EventRouterConfig,
  T5 extends EventRouterConfig,
  T6 extends EventRouterConfig,
  T7 extends EventRouterConfig,
>(
  r1: EventRouterInput<T1>,
  r2: EventRouterInput<T2>,
  r3: EventRouterInput<T3>,
  r4: EventRouterInput<T4>,
  r5: EventRouterInput<T5>,
  r6: EventRouterInput<T6>,
  r7: EventRouterInput<T7>,
): EventRouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5, T6, T7]>>;
export function mergeEventRouters<
  T1 extends EventRouterConfig,
  T2 extends EventRouterConfig,
  T3 extends EventRouterConfig,
  T4 extends EventRouterConfig,
  T5 extends EventRouterConfig,
  T6 extends EventRouterConfig,
  T7 extends EventRouterConfig,
  T8 extends EventRouterConfig,
>(
  r1: EventRouterInput<T1>,
  r2: EventRouterInput<T2>,
  r3: EventRouterInput<T3>,
  r4: EventRouterInput<T4>,
  r5: EventRouterInput<T5>,
  r6: EventRouterInput<T6>,
  r7: EventRouterInput<T7>,
  r8: EventRouterInput<T8>,
): EventRouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5, T6, T7, T8]>>;

// Variadic fallback for 9+
export function mergeEventRouters(
  ...routers: EventRouterInput<EventRouterConfig>[]
): EventRouterDefinition<EventRouterConfig>;

// Implementation
export function mergeEventRouters(
  ...routers: EventRouterInput<EventRouterConfig>[]
): EventRouterDefinition<EventRouterConfig> {
  const merged = routers.map(extractHandlers).reduce(deepMergeConfigs);
  return defineEventRouter(merged);
}
