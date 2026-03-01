/**
 * @fileoverview Factory function for creating router definitions.
 *
 * The `defineRouter` function groups routes into a hierarchical structure
 * with optional router-level defaults for context and tags.
 *
 * @module unified/route/define-router
 */

import type {
  RouterConfig,
  RouterDefaults,
  RouterDefinition,
  RouteDefinition,
  DeepMergeTwo,
  DeepMergeAll,
} from './types';
import { isRouteDefinition, isRouterDefinition } from './types';

/**
 * Options for router definition.
 */
export interface DefineRouterOptions {
  /**
   * Base path prefix for all routes in this router.
   * Will be prepended to all route paths.
   */
  readonly basePath?: string;

  /**
   * Default values applied to all child routes.
   *
   * @example
   * ```typescript
   * defineRouter({
   *   list: listUsersRoute,
   *   get: getUserRoute,
   * }, {
   *   defaults: {
   *     context: zodSchema(executionContextSchema),
   *     tags: ['Users'],
   *   },
   * })
   * ```
   */
  readonly defaults?: RouterDefaults;
}

/**
 * Creates a router definition from a configuration object.
 *
 * A router is a hierarchical grouping of routes that provides:
 * - Organized API structure with nested namespaces
 * - Typed client method generation
 * - OpenAPI tag grouping
 * - Router-level defaults for context and tags
 *
 * @param routes - Object containing routes and nested routers
 * @param options - Optional router configuration
 * @returns A frozen RouterDefinition object
 *
 * @example Basic router
 * ```typescript
 * const api = defineRouter({
 *   users: {
 *     list: listUsersRoute,
 *     get: getUserRoute,
 *     create: createUserRoute,
 *   },
 * });
 * ```
 *
 * @example With router-level defaults
 * ```typescript
 * const api = defineRouter({
 *   list: listUsersRoute,
 *   get: getUserRoute,
 * }, {
 *   basePath: '/api/v1',
 *   defaults: {
 *     context: zodSchema(executionContextSchema),
 *     tags: ['Users'],
 *   },
 * });
 * // Context is applied to all routes that don't define their own.
 * // Tags are merged with each route's existing tags.
 * ```
 */
export function defineRouter<T extends RouterConfig>(
  routes: T,
  options?: DefineRouterOptions,
): RouterDefinition<T> {
  const defaults = options?.defaults;

  // Apply defaults to routes if context or tags are provided
  const processedRoutes =
    defaults?.context || defaults?.tags ? (applyRouterDefaults(routes, defaults) as T) : routes;

  const definition: RouterDefinition<T> = {
    routes: processedRoutes,
    basePath: options?.basePath,
    defaults,
    _isRouter: true,
  };

  // Deep freeze the router definition
  return deepFreeze(definition);
}

/**
 * Recursively applies router-level defaults to all routes in the tree.
 */
function applyRouterDefaults(routes: RouterConfig, defaults: RouterDefaults): RouterConfig {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(routes)) {
    if (isRouteDefinition(value)) {
      result[key] = applyDefaultsToRoute(value, defaults);
    } else if (isRouterDefinition(value)) {
      result[key] = {
        ...value,
        routes: applyRouterDefaults(value.routes, defaults),
      };
    } else if (typeof value === 'object' && value !== null) {
      result[key] = applyRouterDefaults(value as RouterConfig, defaults);
    }
  }

  return result as RouterConfig;
}

/**
 * Applies router-level defaults to a single route definition.
 */
function applyDefaultsToRoute(route: RouteDefinition, defaults: RouterDefaults): RouteDefinition {
  const needsContext = defaults.context && !route.request.context;
  const needsTags = defaults.tags && defaults.tags.length > 0;

  if (!needsContext && !needsTags) return route;

  return Object.freeze({
    ...route,
    request: {
      ...route.request,
      context: route.request.context ?? defaults.context ?? undefined,
    },
    docs: {
      ...route.docs,
      tags: mergeTags(defaults.tags, route.docs.tags),
    },
  }) as RouteDefinition;
}

/**
 * Merges router-level tags with route-level tags, avoiding duplicates.
 */
function mergeTags(
  routerTags?: readonly string[],
  routeTags?: readonly string[],
): readonly string[] | undefined {
  if (!routerTags || routerTags.length === 0) return routeTags;
  if (!routeTags || routeTags.length === 0) return routerTags;

  // Merge, preserving order: router tags first, then route-specific tags (no duplicates)
  const merged = [...routerTags];
  for (const tag of routeTags) {
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
// mergeRouters — variadic deep merge
// ============================================================================

type RouterInput<T extends RouterConfig> = T | RouterDefinition<T>;

/** Extracts the raw RouterConfig from either a plain config or a RouterDefinition. */
function extractRoutes<T extends RouterConfig>(input: RouterInput<T>): T {
  return isRouterDefinition(input) ? input.routes : input;
}

/** Returns true if `value` is a plain sub-router object (not a RouteDefinition, not a RouterDefinition). */
function isSubRouter(value: unknown): value is RouterConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isRouteDefinition(value) &&
    !isRouterDefinition(value)
  );
}

/** Recursively deep-merges two router configs. Sub-routers are merged; leaves are overwritten. */
function deepMergeConfigs(a: RouterConfig, b: RouterConfig): RouterConfig {
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

  return result as RouterConfig;
}

// Overloads for 2–8 routers (clean IDE experience)
export function mergeRouters<T1 extends RouterConfig, T2 extends RouterConfig>(
  r1: RouterInput<T1>,
  r2: RouterInput<T2>,
): RouterDefinition<DeepMergeTwo<T1, T2>>;
export function mergeRouters<
  T1 extends RouterConfig,
  T2 extends RouterConfig,
  T3 extends RouterConfig,
>(
  r1: RouterInput<T1>,
  r2: RouterInput<T2>,
  r3: RouterInput<T3>,
): RouterDefinition<DeepMergeAll<[T1, T2, T3]>>;
export function mergeRouters<
  T1 extends RouterConfig,
  T2 extends RouterConfig,
  T3 extends RouterConfig,
  T4 extends RouterConfig,
>(
  r1: RouterInput<T1>,
  r2: RouterInput<T2>,
  r3: RouterInput<T3>,
  r4: RouterInput<T4>,
): RouterDefinition<DeepMergeAll<[T1, T2, T3, T4]>>;
export function mergeRouters<
  T1 extends RouterConfig,
  T2 extends RouterConfig,
  T3 extends RouterConfig,
  T4 extends RouterConfig,
  T5 extends RouterConfig,
>(
  r1: RouterInput<T1>,
  r2: RouterInput<T2>,
  r3: RouterInput<T3>,
  r4: RouterInput<T4>,
  r5: RouterInput<T5>,
): RouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5]>>;
export function mergeRouters<
  T1 extends RouterConfig,
  T2 extends RouterConfig,
  T3 extends RouterConfig,
  T4 extends RouterConfig,
  T5 extends RouterConfig,
  T6 extends RouterConfig,
>(
  r1: RouterInput<T1>,
  r2: RouterInput<T2>,
  r3: RouterInput<T3>,
  r4: RouterInput<T4>,
  r5: RouterInput<T5>,
  r6: RouterInput<T6>,
): RouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5, T6]>>;
export function mergeRouters<
  T1 extends RouterConfig,
  T2 extends RouterConfig,
  T3 extends RouterConfig,
  T4 extends RouterConfig,
  T5 extends RouterConfig,
  T6 extends RouterConfig,
  T7 extends RouterConfig,
>(
  r1: RouterInput<T1>,
  r2: RouterInput<T2>,
  r3: RouterInput<T3>,
  r4: RouterInput<T4>,
  r5: RouterInput<T5>,
  r6: RouterInput<T6>,
  r7: RouterInput<T7>,
): RouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5, T6, T7]>>;
export function mergeRouters<
  T1 extends RouterConfig,
  T2 extends RouterConfig,
  T3 extends RouterConfig,
  T4 extends RouterConfig,
  T5 extends RouterConfig,
  T6 extends RouterConfig,
  T7 extends RouterConfig,
  T8 extends RouterConfig,
>(
  r1: RouterInput<T1>,
  r2: RouterInput<T2>,
  r3: RouterInput<T3>,
  r4: RouterInput<T4>,
  r5: RouterInput<T5>,
  r6: RouterInput<T6>,
  r7: RouterInput<T7>,
  r8: RouterInput<T8>,
): RouterDefinition<DeepMergeAll<[T1, T2, T3, T4, T5, T6, T7, T8]>>;

// Variadic fallback for 9+
export function mergeRouters(
  ...routers: RouterInput<RouterConfig>[]
): RouterDefinition<RouterConfig>;

// Implementation
export function mergeRouters(
  ...routers: RouterInput<RouterConfig>[]
): RouterDefinition<RouterConfig> {
  const merged = routers.map(extractRoutes).reduce(deepMergeConfigs);
  return defineRouter(merged);
}
