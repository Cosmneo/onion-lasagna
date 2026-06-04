/**
 * @fileoverview Type definitions for Svelte Query integration.
 *
 * Provides type-safe hooks and query key types that map from
 * the unified route system's router configuration.
 *
 * @module unified/svelte-query/types
 */

import type {
  CreateQueryOptions,
  CreateQueryResult,
  CreateMutationOptions,
  CreateMutationResult,
  QueryOptions,
} from '@tanstack/svelte-query';
import type { Readable } from 'svelte/store';
import type {
  RouteDefinition,
  RouterConfig,
  HasPathParams,
  PathParams,
  PrettifyDeep,
} from '@cosmneo/onion-lasagna/http/route';
import type { ClientConfig } from '@cosmneo/onion-lasagna-client';
import { ClientError } from '@cosmneo/onion-lasagna-client';

/** A value that can be either a plain `T` or a Svelte `Readable<T>` store. */
export type StoreOrVal<T> = T | Readable<T>;

// Re-export ClientError for consumer convenience
export { ClientError };

// ============================================================================
// Input Types (mirrored from client for independence)
// ============================================================================

/**
 * Input for a hook request method.
 * Mirrors ClientRequestInput but defined locally to avoid coupling.
 */
export type HookRequestInput<TRoute extends RouteDefinition> = PrettifyDeep<
  (HasPathParams<TRoute['path']> extends true
    ? { pathParams: PathParams<TRoute['path']> }
    : object) &
    (TRoute['_types']['body'] extends undefined ? object : { body: TRoute['_types']['body'] }) &
    (TRoute['_types']['query'] extends undefined ? object : { query: TRoute['_types']['query'] }) &
    (TRoute['_types']['headers'] extends undefined
      ? object
      : { headers: TRoute['_types']['headers'] })
>;

/**
 * Response from a hook request.
 * Reads the response type directly from the route's `_types.response`.
 */
export type HookResponse<TRoute extends RouteDefinition> =
  TRoute['_types']['response'] extends undefined ? void : TRoute['_types']['response'];

/**
 * Checks if a route requires input (has body, params, or required query).
 */
type RequiresInput<TRoute extends RouteDefinition> =
  HasPathParams<TRoute['path']> extends true
    ? true
    : TRoute['_types']['body'] extends undefined
      ? false
      : true;

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Extra options accepted by the generated `createQuery` hooks beyond the standard
 * Tanstack Query options. The `enabled` field is widened to also accept a
 * `Readable<boolean>` store so that consumers can pass reactive signals directly.
 */
export type ReactiveCreateQueryOptions<TData, TError> = Omit<
  CreateQueryOptions<TData, TError>,
  'queryKey' | 'queryFn' | 'enabled'
> & {
  /** Static boolean OR a `Readable<boolean>` store for reactive gating. */
  enabled?: StoreOrVal<boolean>;
};

/**
 * Hooks for GET/HEAD routes (queries).
 *
 * Both `input` and `options.enabled` accept either plain values (backward compatible)
 * or Svelte `Readable` stores for full reactivity (P05-1 fix).
 */
export interface QueryRouteHooks<TRoute extends RouteDefinition> {
  createQuery: RequiresInput<TRoute> extends true
    ? (
        input: StoreOrVal<HookRequestInput<TRoute>>,
        options?: ReactiveCreateQueryOptions<HookResponse<TRoute>, ClientError>,
      ) => CreateQueryResult<HookResponse<TRoute>, ClientError>
    : (
        input?: StoreOrVal<HookRequestInput<TRoute>>,
        options?: ReactiveCreateQueryOptions<HookResponse<TRoute>, ClientError>,
      ) => CreateQueryResult<HookResponse<TRoute>, ClientError>;
}

/**
 * Hooks for POST/PUT/PATCH/DELETE routes (mutations).
 */
export interface MutationRouteHooks<TRoute extends RouteDefinition> {
  createMutation: (
    options?: Omit<
      CreateMutationOptions<HookResponse<TRoute>, ClientError, HookRequestInput<TRoute>>,
      'mutationFn'
    >,
  ) => CreateMutationResult<HookResponse<TRoute>, ClientError, HookRequestInput<TRoute>, unknown>;
}

/**
 * HTTP methods that map to createQuery.
 */
type QueryMethods = 'GET' | 'HEAD';

/**
 * Maps a single route to its hook type based on HTTP method.
 */
type RouteToHooks<TRoute extends RouteDefinition> = TRoute['method'] extends QueryMethods
  ? QueryRouteHooks<TRoute>
  : MutationRouteHooks<TRoute>;

/**
 * Recursively maps a router config to hook objects.
 */
export type InferHooks<T extends RouterConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for proper extends check on generic interface
  [K in keyof T]: T[K] extends RouteDefinition<any, any, any, any, any, any, any, any>
    ? RouteToHooks<T[K]>
    : T[K] extends RouterConfig
      ? InferHooks<T[K]>
      : never;
};

// ============================================================================
// Query Key Types
// ============================================================================

/**
 * A callable query key function that returns a key array.
 * When called with input, appends it to the key.
 */
export type QueryKeyFn<TRoute extends RouteDefinition> =
  RequiresInput<TRoute> extends true
    ? (input?: HookRequestInput<TRoute>) => readonly unknown[]
    : (input?: HookRequestInput<TRoute>) => readonly unknown[];

/**
 * A namespace key function that is callable and has child properties.
 * Enables both `queryKeys.users()` and `queryKeys.users.list()`.
 */
export type QueryKeyNamespace<T extends RouterConfig> =
  // eslint-disable-next-line @typescript-eslint/prefer-function-type -- Callable + properties intersection requires type literal
  { (): readonly unknown[] } & PrettifyDeep<InferQueryKeys<T>>;

/**
 * Recursively maps a router config to query key functions.
 */
export type InferQueryKeys<T extends RouterConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for proper extends check on generic interface
  [K in keyof T]: T[K] extends RouteDefinition<any, any, any, any, any, any, any, any>
    ? QueryKeyFn<T[K]>
    : T[K] extends RouterConfig
      ? QueryKeyNamespace<T[K]>
      : never;
};

// ============================================================================
// Query Options Types
// ============================================================================

/**
 * Query options function for a single GET/HEAD route.
 * Returns a `queryOptions({ queryKey, queryFn })` object for use with
 * `queryClient.ensureQueryData()`, `queryClient.prefetchQuery()`,
 * or SvelteKit's `load` function.
 */
export type QueryOptionsFn<TRoute extends RouteDefinition> =
  RequiresInput<TRoute> extends true
    ? (input: HookRequestInput<TRoute>) => QueryOptions<HookResponse<TRoute>, ClientError>
    : (input?: HookRequestInput<TRoute>) => QueryOptions<HookResponse<TRoute>, ClientError>;

/**
 * Recursively maps a router config to query options functions.
 * Only includes GET/HEAD routes (mutations are excluded).
 */
export type InferQueryOptions<T extends RouterConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for proper extends check on generic interface
  [K in keyof T]: T[K] extends RouteDefinition<any, any, any, any, any, any, any, any>
    ? T[K]['method'] extends QueryMethods
      ? QueryOptionsFn<T[K]>
      : never
    : T[K] extends RouterConfig
      ? InferQueryOptions<T[K]>
      : never;
};

// ============================================================================
// Factory Result
// ============================================================================

/**
 * Result of `createSvelteQueryHooks()`.
 */
export interface SvelteQueryHooksResult<T extends RouterConfig> {
  /**
   * Hook objects mirroring the router structure.
   * GET/HEAD -> `{ createQuery }`, POST/PUT/PATCH/DELETE -> `{ createMutation }`.
   */
  readonly hooks: PrettifyDeep<InferHooks<T>>;

  /**
   * Query key functions for cache invalidation.
   * Each key is callable and returns an array for use with `queryClient.invalidateQueries()`.
   */
  readonly queryKeys: PrettifyDeep<InferQueryKeys<T>>;

  /**
   * Query options functions for use with `ensureQueryData`, `prefetchQuery`, or SvelteKit's `load`.
   * Only includes GET/HEAD routes.
   */
  readonly queryOptions: PrettifyDeep<InferQueryOptions<T>>;
}

/**
 * Configuration for `createSvelteQueryHooks()`.
 * Extends the client config with Svelte Query-specific options.
 */
export interface SvelteQueryHooksConfig extends ClientConfig {
  /**
   * Prefix prepended to all query keys to prevent cache collisions
   * when multiple `createSvelteQueryHooks()` instances share the same QueryClient.
   *
   * @example
   * ```typescript
   * const { hooks: userHooks } = createSvelteQueryHooks(userRouter, {
   *   baseUrl: '/api/users',
   *   queryKeyPrefix: 'users-api',
   * });
   *
   * const { hooks: productHooks } = createSvelteQueryHooks(productRouter, {
   *   baseUrl: '/api/products',
   *   queryKeyPrefix: 'products-api',
   * });
   *
   * // Keys are namespaced: ['users-api', 'list'] vs ['products-api', 'list']
   * ```
   */
  readonly queryKeyPrefix?: string;

  /**
   * Function that gates all generated `createQuery` hooks.
   *
   * Called once when `createQuery` is invoked (not per-render). The return value
   * is AND-ed with any per-query `enabled` option. Returning a `Readable<boolean>`
   * makes the gate fully reactive — queries re-enable automatically when the store
   * emits `true` (e.g., when an auth session becomes valid).
   *
   * Mutations are not affected — they fire on explicit `.mutate()`.
   *
   * @example Gate queries on auth session readiness (reactive)
   * ```typescript
   * const sessionValid = writable(false);
   *
   * const { hooks } = createSvelteQueryHooks(router, {
   *   baseUrl: '/api',
   *   useEnabled: () => sessionValid, // returns Readable<boolean>
   * });
   *
   * // Queries are disabled until the session becomes valid
   * sessionValid.set(true); // all queries re-enable automatically
   * ```
   *
   * @example Static boolean (backward compatible)
   * ```typescript
   * const { hooks } = createSvelteQueryHooks(router, {
   *   baseUrl: '/api',
   *   useEnabled: () => isAuthenticated, // plain boolean
   * });
   * ```
   */
  readonly useEnabled?: () => StoreOrVal<boolean>;
}
