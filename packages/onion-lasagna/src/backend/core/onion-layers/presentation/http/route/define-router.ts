/**
 * @fileoverview Factory function for creating router definitions.
 *
 * The `defineRouter` function groups routes into a hierarchical structure
 * that enables organized API clients, OpenAPI tag grouping, and structured
 * server route registration.
 *
 * @module unified/route/define-router
 */

import type { RouterConfig, RouterDefinition } from './types';

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

/**
 * Merges two routers into a new router.
 *
 * @example
 * ```typescript
 * const combinedApi = mergeRouters(
 *   { users: userRouter },
 *   { posts: postRouter },
 * );
 * ```
 */
export function mergeRouters<T1 extends RouterConfig, T2 extends RouterConfig>(
  router1: T1 | RouterDefinition<T1>,
  router2: T2 | RouterDefinition<T2>,
): RouterDefinition<T1 & T2> {
  const routes1 = 'routes' in router1 ? router1.routes : router1;
  const routes2 = 'routes' in router2 ? router2.routes : router2;

  return defineRouter({
    ...routes1,
    ...routes2,
  } as T1 & T2);
}
