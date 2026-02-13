/**
 * @fileoverview Type definitions for React Query integration.
 *
 * Provides type-safe hooks and query key types that map from
 * the unified route system's router configuration.
 *
 * @module unified/react-query/types
 */

import type {
  UseQueryOptions,
  UseQueryResult,
  UseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';
import type {
  RouteDefinition,
  RouterConfig,
  ResponsesConfig,
  HasPathParams,
  PathParams,
  PrettifyDeep,
} from '../route/types';
import type { ClientConfig } from '../client/types';
import { ClientError } from '../client/types';

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
 * Response type extraction (first 2xx response).
 * Uses structural matching on schema's _output phantom property.
 */
type ExtractSuccessResponse<T extends ResponsesConfig> = T extends {
  200: { schema: { _output: infer TBody } };
}
  ? TBody
  : T extends { 201: { schema: { _output: infer TBody } } }
    ? TBody
    : T extends { 202: { schema: { _output: infer TBody } } }
      ? TBody
      : T extends { 204: { description: string } }
        ? void // eslint-disable-line @typescript-eslint/no-invalid-void-type -- void is semantically correct for 204 No Content
        : unknown;

/**
 * Response from a hook request.
 */
export type HookResponse<TRoute extends RouteDefinition> = ExtractSuccessResponse<
  TRoute['responses']
>;

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
 */
export interface QueryRouteHooks<TRoute extends RouteDefinition> {
  useQuery: RequiresInput<TRoute> extends true
    ? (
        input: HookRequestInput<TRoute>,
        options?: Omit<UseQueryOptions<HookResponse<TRoute>, ClientError>, 'queryKey' | 'queryFn'>,
      ) => UseQueryResult<HookResponse<TRoute>, ClientError>
    : (
        input?: HookRequestInput<TRoute>,
        options?: Omit<UseQueryOptions<HookResponse<TRoute>, ClientError>, 'queryKey' | 'queryFn'>,
      ) => UseQueryResult<HookResponse<TRoute>, ClientError>;
}

/**
 * Hooks for POST/PUT/PATCH/DELETE routes (mutations).
 */
export interface MutationRouteHooks<TRoute extends RouteDefinition> {
  useMutation: (
    options?: Omit<
      UseMutationOptions<HookResponse<TRoute>, ClientError, HookRequestInput<TRoute>>,
      'mutationFn'
    >,
  ) => UseMutationResult<HookResponse<TRoute>, ClientError, HookRequestInput<TRoute>>;
}

/**
 * HTTP methods that map to useQuery.
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
    ? {
        (input: HookRequestInput<TRoute>): readonly unknown[];
        (): readonly unknown[];
      }
    : {
        (input?: HookRequestInput<TRoute>): readonly unknown[];
        (): readonly unknown[];
      };

/**
 * A namespace key function that is callable and has child properties.
 * Enables both `queryKeys.users()` and `queryKeys.users.list()`.
 */
export type QueryKeyNamespace<T extends RouterConfig> = {
  (): readonly unknown[];
} & PrettifyDeep<InferQueryKeys<T>>;

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
 * Result of `createReactQueryHooks()`.
 */
export interface ReactQueryHooksResult<T extends RouterConfig> {
  /**
   * Hook objects mirroring the router structure.
   * GET/HEAD → `{ useQuery }`, POST/PUT/PATCH/DELETE → `{ useMutation }`.
   */
  readonly hooks: PrettifyDeep<InferHooks<T>>;

  /**
   * Query key functions for cache invalidation.
   * Each key is callable and returns an array for use with `queryClient.invalidateQueries()`.
   */
  readonly queryKeys: PrettifyDeep<InferQueryKeys<T>>;
}

/**
 * Configuration for `createReactQueryHooks()`.
 * Same as the client config.
 */
export type ReactQueryHooksConfig = ClientConfig;
