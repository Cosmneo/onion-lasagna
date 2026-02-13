/**
 * @fileoverview Router definition types for grouping routes.
 *
 * A router is a hierarchical grouping of routes that enables:
 * - Organized API structure
 * - Nested client method generation
 * - Grouped OpenAPI tags
 *
 * @module unified/route/types/router-definition
 */

import type { RouteDefinition, ResponsesConfig } from './route-definition.type';
import type { HttpMethod } from './http.type';

// ============================================================================
// Router Types
// ============================================================================

/**
 * A router entry can be either a route definition or a nested router.
 * Uses permissive types to allow any valid route definition.
 */
export type RouterEntry =
  | RouteDefinition<
      HttpMethod,
      string,
      unknown,
      unknown,
      unknown,
      unknown,
      unknown,
      ResponsesConfig
    >
  | RouterConfig;

/**
 * Configuration for a router (group of routes).
 */
export interface RouterConfig {
  readonly [key: string]: RouterEntry;
}

/**
 * A fully defined router.
 */
export interface RouterDefinition<T extends RouterConfig = RouterConfig> {
  /**
   * The routes and nested routers in this router.
   */
  readonly routes: T;

  /**
   * Base path prefix for all routes in this router.
   */
  readonly basePath?: string;

  /**
   * Default tags for all routes in this router.
   */
  readonly tags?: readonly string[];

  /**
   * Marker to identify this as a router.
   * @internal
   */
  readonly _isRouter: true;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Checks if a value is a RouteDefinition.
 */
export function isRouteDefinition(value: unknown): value is RouteDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'method' in value &&
    'path' in value &&
    'responses' in value &&
    '_types' in value
  );
}

/**
 * Checks if a value is a RouterDefinition.
 */
export function isRouterDefinition(value: unknown): value is RouterDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_isRouter' in value &&
    (value as RouterDefinition)._isRouter === true
  );
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Flattens a router into a map of path keys to route definitions.
 *
 * @example
 * ```typescript
 * const router = defineRouter({
 *   users: {
 *     list: listUsersRoute,
 *     get: getUserRoute,
 *   },
 *   posts: {
 *     create: createPostRoute,
 *   },
 * });
 *
 * type Flat = FlattenRouter<typeof router>;
 * // {
 * //   'users.list': typeof listUsersRoute,
 * //   'users.get': typeof getUserRoute,
 * //   'posts.create': typeof createPostRoute,
 * // }
 * ```
 */
export type FlattenRouter<
  T extends RouterConfig,
  Prefix extends string = '',
> = T extends RouterConfig
  ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [K in keyof T]: T[K] extends RouteDefinition<any, any, any, any, any, any, any, any>
        ? { [P in `${Prefix}${K & string}`]: T[K] }
        : T[K] extends RouterConfig
          ? FlattenRouter<T[K], `${Prefix}${K & string}.`>
          : never;
    }[keyof T] extends infer U
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      U extends Record<string, RouteDefinition<any, any, any, any, any, any, any, any>>
      ? U
      : never
    : never
  : never;

/**
 * Gets all route keys from a router.
 *
 * @example
 * ```typescript
 * type Keys = RouterKeys<typeof router>;
 * // 'users.list' | 'users.get' | 'posts.create'
 * ```
 */
export type RouterKeys<T extends RouterConfig, Prefix extends string = ''> = T extends RouterConfig
  ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [K in keyof T]: T[K] extends RouteDefinition<any, any, any, any, any, any, any, any>
        ? `${Prefix}${K & string}`
        : T[K] extends RouterConfig
          ? RouterKeys<T[K], `${Prefix}${K & string}.`>
          : never;
    }[keyof T]
  : never;

/**
 * Gets a route by its dotted key path.
 *
 * @example
 * ```typescript
 * type UserGet = GetRoute<typeof router, 'users.get'>;
 * // typeof getUserRoute
 * ```
 */
export type GetRoute<
  T extends RouterConfig,
  K extends string,
> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? T[Head] extends RouterConfig
      ? GetRoute<T[Head], Tail>
      : never
    : never
  : K extends keyof T
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T[K] extends RouteDefinition<any, any, any, any, any, any, any, any>
      ? T[K]
      : never
    : never;

// ============================================================================
// Deep Merge Types
// ============================================================================

/**
 * Deep-merges two router configs at the type level.
 *
 * - If both sides are sub-routers (extend RouterConfig), recurse.
 * - Otherwise last-one-wins (B overrides A).
 * - RouteDefinition does NOT extend RouterConfig (it has `method`, `path`, etc.)
 *   so the conditional correctly distinguishes leaves from sub-routers.
 */
export type DeepMergeTwo<A extends RouterConfig, B extends RouterConfig> = {
  readonly [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] extends RouterConfig
        ? B[K] extends RouterConfig
          ? DeepMergeTwo<A[K], B[K]>
          : B[K]
        : B[K]
      : A[K]
    : K extends keyof B
      ? B[K]
      : never;
};

/**
 * Recursively deep-merges N router configs left-to-right.
 */
export type DeepMergeAll<T extends readonly RouterConfig[]> =
  T extends readonly [infer Only extends RouterConfig]
    ? Only
    : T extends readonly [
          infer First extends RouterConfig,
          infer Second extends RouterConfig,
          ...infer Rest extends readonly RouterConfig[],
        ]
      ? DeepMergeAll<[DeepMergeTwo<First, Second>, ...Rest]>
      : RouterConfig;

/**
 * Recursively flattens complex types for clean IDE hover display.
 * Applied at return sites (not inside recursion) so DTS emit stays fast —
 * TypeScript only resolves when concrete types are provided.
 *
 * Works with any recursive object type: router configs, client types,
 * React Query hooks, etc. Functions and primitives pass through unchanged.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrettifyDeep<T> = T extends (...args: any[]) => any
  ? T
  : T extends object
    ? { readonly [K in keyof T]: PrettifyDeep<T[K]> }
    : T;

/**
 * Collects all routes from a router into an array.
 */
export function collectRoutes(
  config: RouterConfig,
  basePath = '',
): { key: string; route: RouteDefinition }[] {
  const routes: { key: string; route: RouteDefinition }[] = [];

  for (const [key, value] of Object.entries(config)) {
    const fullKey = basePath ? `${basePath}.${key}` : key;

    if (isRouteDefinition(value)) {
      routes.push({ key: fullKey, route: value });
    } else if (isRouterDefinition(value)) {
      routes.push(...collectRoutes(value.routes, fullKey));
    } else if (typeof value === 'object' && value !== null) {
      routes.push(...collectRoutes(value as RouterConfig, fullKey));
    }
  }

  return routes;
}
