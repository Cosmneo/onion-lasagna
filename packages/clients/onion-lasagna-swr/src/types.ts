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
 * Hooks for POST/PUT/PATCH/DELETE routes (mutations).
 */
export interface MutationRouteHooks<TRoute extends RouteDefinition> {
  useSWRMutation: (
    options?: Omit<
      SWRMutationConfiguration<
        HookResponse<TRoute>,
        ClientError,
        readonly unknown[],
        HookRequestInput<TRoute>
      >,
      'fetcher'
    >,
  ) => SWRMutationResponse<
    HookResponse<TRoute>,
    ClientError,
    readonly unknown[],
    HookRequestInput<TRoute>
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
