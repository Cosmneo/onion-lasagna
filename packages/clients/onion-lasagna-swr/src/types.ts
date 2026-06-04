/**
 * @fileoverview Type definitions for SWR integration.
 *
 * Provides type-safe hooks and query key types that map from
 * the unified route system's router configuration.
 *
 * @module unified/swr/types
 */

import type { SWRResponse, SWRConfiguration } from 'swr';
import type { SWRMutationResponse, SWRMutationConfiguration } from 'swr/mutation';
import type {
  RouteDefinition,
  RouterConfig,
  HasPathParams,
  PathParams,
  PrettifyDeep,
} from '@cosmneo/onion-lasagna/http/route';
import type { ClientConfig } from '@cosmneo/onion-lasagna-client';
import { ClientError } from '@cosmneo/onion-lasagna-client';

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
 * Checks if a route requires input (has body, params, or at least one required query field).
 *
 * P06-1: A route also requires input when it has a query type whose required fields cannot
 * be satisfied by an empty object `{}`.  The `{} extends TQuery` check returns `true` when
 * ALL query fields are optional (so input is not required) and `false` when at least one
 * field is required (so input IS required).
 */
type RequiresInput<TRoute extends RouteDefinition> =
  HasPathParams<TRoute['path']> extends true
    ? true
    : TRoute['_types']['body'] extends undefined
      ? TRoute['_types']['query'] extends undefined
        ? false
        : {} extends TRoute['_types']['query']
          ? false
          : true
      : true;

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Hooks for GET/HEAD routes (queries).
 *
 * Accepts an optional `enabled` property in options for API consistency
 * with other adapters. Internally maps to SWR's null-key pattern.
 */
export interface QueryRouteHooks<TRoute extends RouteDefinition> {
  useSWR: RequiresInput<TRoute> extends true
    ? (
        input: HookRequestInput<TRoute>,
        options?: Omit<SWRConfiguration<HookResponse<TRoute>, ClientError>, 'fetcher'> & {
          enabled?: boolean;
        },
      ) => SWRResponse<HookResponse<TRoute>, ClientError>
    : (
        input?: HookRequestInput<TRoute>,
        options?: Omit<SWRConfiguration<HookResponse<TRoute>, ClientError>, 'fetcher'> & {
          enabled?: boolean;
        },
      ) => SWRResponse<HookResponse<TRoute>, ClientError>;
}

/**
 * P06-3: The extra-arg type for a mutation trigger.
 * When the route requires no input, `void` is used so `trigger()` (no-arg call) typechecks.
 * When input is required, the full `HookRequestInput` is used.
 */
type MutationExtraArg<TRoute extends RouteDefinition> = RequiresInput<TRoute> extends true
  ? HookRequestInput<TRoute>
  : void | HookRequestInput<TRoute>;

/**
 * Hooks for POST/PUT/PATCH/DELETE routes (mutations).
 *
 * P06-3: When the route has no required input, the `trigger()` call is no-arg (void).
 * When input is required, `trigger(input)` is enforced.
 */
export interface MutationRouteHooks<TRoute extends RouteDefinition> {
  useSWRMutation: (
    options?: Omit<
      SWRMutationConfiguration<
        HookResponse<TRoute>,
        ClientError,
        readonly unknown[],
        MutationExtraArg<TRoute>
      >,
      'fetcher'
    >,
  ) => SWRMutationResponse<
    HookResponse<TRoute>,
    ClientError,
    readonly unknown[],
    MutationExtraArg<TRoute>
  >;
}

/**
 * HTTP methods that map to useSWR.
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
 *
 * P06-2: Both branches of the original ternary were identical — collapsed to a single signature.
 */
export type QueryKeyFn<TRoute extends RouteDefinition> = (
  input?: HookRequestInput<TRoute>,
) => readonly unknown[];

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
// Preload Options Types
// ============================================================================

/**
 * Return type from a preload options function.
 * Contains the SWR key and fetcher for use with `preload(key, fetcher)`.
 */
export interface PreloadConfig<TData> {
  readonly key: readonly unknown[];
  readonly fetcher: () => Promise<TData>;
}

/**
 * Preload options function for a single GET/HEAD route.
 * Returns `{ key, fetcher }` for use with SWR's `preload()`.
 *
 * @example Preload on hover
 * ```typescript
 * import { preload } from 'swr';
 *
 * const opts = preloadOptions.users.list({ query: { page: 1 } });
 * preload(opts.key, opts.fetcher);
 * ```
 */
export type PreloadOptionsFn<TRoute extends RouteDefinition> =
  RequiresInput<TRoute> extends true
    ? (input: HookRequestInput<TRoute>) => PreloadConfig<HookResponse<TRoute>>
    : (input?: HookRequestInput<TRoute>) => PreloadConfig<HookResponse<TRoute>>;

/**
 * Recursively maps a router config to preload options functions.
 * Only includes GET/HEAD routes (mutations are excluded).
 */
export type InferPreloadOptions<T extends RouterConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for proper extends check on generic interface
  [K in keyof T]: T[K] extends RouteDefinition<any, any, any, any, any, any, any, any>
    ? T[K]['method'] extends QueryMethods
      ? PreloadOptionsFn<T[K]>
      : never
    : T[K] extends RouterConfig
      ? InferPreloadOptions<T[K]>
      : never;
};

// ============================================================================
// Factory Result
// ============================================================================

/**
 * Result of `createSWRHooks()`.
 */
export interface SWRHooksResult<T extends RouterConfig> {
  /**
   * Hook objects mirroring the router structure.
   * GET/HEAD -> `{ useSWR }`, POST/PUT/PATCH/DELETE -> `{ useSWRMutation }`.
   */
  readonly hooks: PrettifyDeep<InferHooks<T>>;

  /**
   * Query key functions for cache invalidation.
   * Each key is callable and returns an array for use with SWR's `mutate()`.
   */
  readonly queryKeys: PrettifyDeep<InferQueryKeys<T>>;

  /**
   * Preload options for use with SWR's `preload(key, fetcher)`.
   * Only includes GET/HEAD routes.
   *
   * @example
   * ```typescript
   * import { preload } from 'swr';
   * const opts = preloadOptions.users.list({ query: { page: 1 } });
   * preload(opts.key, opts.fetcher);
   * ```
   */
  readonly preloadOptions: PrettifyDeep<InferPreloadOptions<T>>;
}

/**
 * Configuration for `createSWRHooks()`.
 * Extends the client config with SWR-specific options.
 */
export interface SWRHooksConfig extends ClientConfig {
  /**
   * Prefix prepended to all query keys to prevent cache collisions
   * when multiple `createSWRHooks()` instances share the same SWR cache.
   *
   * @example
   * ```typescript
   * const { hooks: userHooks } = createSWRHooks(userRouter, {
   *   baseUrl: '/api/users',
   *   queryKeyPrefix: 'users-api',
   * });
   *
   * const { hooks: productHooks } = createSWRHooks(productRouter, {
   *   baseUrl: '/api/products',
   *   queryKeyPrefix: 'products-api',
   * });
   *
   * // Keys are namespaced: ['users-api', 'list'] vs ['products-api', 'list']
   * ```
   */
  readonly queryKeyPrefix?: string;

  /**
   * React hook that gates all generated `useSWR` hooks.
   *
   * Called inside every query hook (valid hooks usage — always unconditional).
   * When it returns `false`, the SWR key is set to `null` to prevent fetching.
   * This is AND-ed with any per-query `enabled` option:
   * `isEnabled = useEnabled() && (userEnabled ?? true)`.
   *
   * Mutations are not affected — they fire on explicit `.trigger()`.
   *
   * @example Gate queries on auth session readiness
   * ```typescript
   * const { hooks } = createSWRHooks(router, {
   *   baseUrl: '/api',
   *   useEnabled: () => {
   *     const { isValid } = useValidSession();
   *     return isValid;
   *   },
   * });
   *
   * // No manual enabled check needed — session gating is automatic
   * const { data } = hooks.users.list.useSWR();
   * ```
   */
  readonly useEnabled?: () => boolean;
}
