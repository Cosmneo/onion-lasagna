/**
 * @fileoverview Factory function for creating router definitions.
 *
 * The `defineRouter` function groups routes into a hierarchical structure
 * that enables organized API clients, OpenAPI tag grouping, and structured
 * server route registration.
 *
 * @module unified/route/define-router
 */

import type { RouterConfig, RouterDefinition, DeepMergeTwo, DeepMergeAll } from './types';
import { isRouteDefinition, isRouterDefinition } from './types';

/**
 * Options for router definition.
 */
export interface DefineRouterOptions {
  /**
   * Base path prefix for all routes in this router.
   * Will be prepended to all route paths.
   *
   * @example
   * ```typescript
   * defineRouter({ ... }, { basePath: '/api/v1' })
   * ```
   */
  readonly basePath?: string;

  /**
   * Default tags for all routes in this router.
   * Will be merged with route-specific tags.
   */
  readonly tags?: readonly string[];
}

/**
 * Creates a router definition from a configuration object.
 *
 * A router is a hierarchical grouping of routes that provides:
 * - Organized API structure with nested namespaces
 * - Typed client method generation
 * - OpenAPI tag grouping
 * - Server route registration
 *
 * @param routes - Object containing routes and nested routers
 * @param options - Optional router configuration
 * @returns A frozen RouterDefinition object
 *
 * @example Basic router
 * ```typescript
 * import { defineRouter } from '@cosmneo/onion-lasagna/http';
 *
 * const api = defineRouter({
 *   users: {
 *     list: listUsersRoute,
 *     get: getUserRoute,
 *     create: createUserRoute,
 *     update: updateUserRoute,
 *     delete: deleteUserRoute,
 *   },
 *   posts: {
 *     list: listPostsRoute,
 *     get: getPostRoute,
 *     create: createPostRoute,
 *   },
 * });
 *
 * // Client usage:
 * // client.users.list({ query: { page: 1 } })
 * // client.users.get({ params: { id: '123' } })
 * // client.posts.create({ body: { title: 'Hello' } })
 * ```
 *
 * @example Nested routers
 * ```typescript
 * const projectRouter = defineRouter({
 *   list: listProjectsRoute,
 *   get: getProjectRoute,
 *   tasks: {
 *     list: listTasksRoute,
 *     create: createTaskRoute,
 *     update: updateTaskRoute,
 *   },
 *   members: {
 *     list: listMembersRoute,
 *     add: addMemberRoute,
 *     remove: removeMemberRoute,
 *   },
 * });
 *
 * const api = defineRouter({
 *   projects: projectRouter.routes,
 *   users: userRouter.routes,
 * });
 *
 * // Client usage:
 * // client.projects.tasks.create({ params: { projectId: '123' }, body: { ... } })
 * ```
 *
 * @example With base path and tags
 * ```typescript
 * const adminApi = defineRouter({
 *   users: {
 *     list: listUsersRoute,
 *     ban: banUserRoute,
 *   },
 *   analytics: {
 *     dashboard: getDashboardRoute,
 *     reports: getReportsRoute,
 *   },
 * }, {
 *   basePath: '/admin',
 *   tags: ['Admin'],
 * });
 * ```
 */
export function defineRouter<T extends RouterConfig>(
  routes: T,
  options?: DefineRouterOptions,
): RouterDefinition<T> {
  const definition: RouterDefinition<T> = {
    routes,
    basePath: options?.basePath,
    tags: options?.tags,
    _isRouter: true,
  };

  // Deep freeze the router definition
  return deepFreeze(definition);
}

/**
 * Deep freezes an object and all its nested objects.
 */
function deepFreeze<T extends object>(obj: T): T {
  // Get all property names
  const propNames = Object.getOwnPropertyNames(obj) as (keyof T)[];

  // Freeze properties before freezing self
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

/**
 * Merges multiple routers into a single router with deep merge.
 *
 * Overlapping sub-router keys are recursively merged instead of overwritten.
 * Leaf routes (RouteDefinition) use last-one-wins semantics.
 *
 * @example
 * ```typescript
 * const api = mergeRouters(
 *   userRouter,
 *   organizationRouter,
 *   feedbackRouter,
 * );
 * // If all three define `users`, their sub-routes are deep-merged.
 * ```
 */
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
