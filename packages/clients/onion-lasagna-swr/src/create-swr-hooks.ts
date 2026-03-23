/**
 * @fileoverview Factory for creating SWR hooks from router definitions.
 *
 * Builds on top of `createClient` — no HTTP logic is duplicated.
 * GET/HEAD routes get `useSWR`, other methods get `useSWRMutation`.
 *
 * @module unified/swr/create-swr-hooks
 */

import useSWRHook from 'swr';
import useSWRMutationHook from 'swr/mutation';
import type {
  RouterConfig,
  RouterDefinition,
  PrettifyDeep,
} from '@cosmneo/onion-lasagna/http/route';
import { isRouteDefinition, isRouterDefinition } from '@cosmneo/onion-lasagna/http/route';
import { createClient } from '@cosmneo/onion-lasagna-client';
import { buildQueryKeys } from './query-keys';
import type {
  SWRHooksResult,
  SWRHooksConfig,
  InferHooks,
  InferQueryKeys,
  InferPreloadOptions,
} from './types';

/**
 * HTTP methods that map to `useSWR`.
 */
const QUERY_METHODS = new Set(['GET', 'HEAD']);

/**
 * Creates SWR hooks from a router definition.
 *
 * Reuses `createClient` internally for all HTTP logic.
 * GET/HEAD routes produce `{ useSWR }`, all others produce `{ useSWRMutation }`.
 *
 * @param router - Router definition or router config
 * @param config - Client configuration (baseUrl, headers, etc.) with optional queryKeyPrefix
 * @returns `{ hooks, queryKeys }` — hooks mirror the router structure, queryKeys for cache invalidation
 *
 * @example Basic usage
 * ```typescript
 * import { createSWRHooks } from '@cosmneo/onion-lasagna-swr';
 *
 * const { hooks, queryKeys } = createSWRHooks(api, {
 *   baseUrl: 'http://localhost:3000',
 * });
 *
 * // GET -> useSWR
 * const { data } = hooks.users.list.useSWR({ query: { page: 1 } });
 *
 * // POST -> useSWRMutation
 * const { trigger } = hooks.users.create.useSWRMutation();
 * trigger({ body: { name: 'John' } });
 * ```
 */
export function createSWRHooks<T extends RouterConfig>(
  router: T | RouterDefinition<T>,
  config: SWRHooksConfig,
): SWRHooksResult<T> {
  const routes = isRouterDefinition(router) ? router.routes : router;
  const prefix = config.queryKeyPrefix ? [config.queryKeyPrefix] : [];

  // Create the underlying HTTP client
  const client = createClient(router, config);

  // Build hooks proxy, query keys, and preload options (with optional prefix for cache isolation)
  const hooks = buildHooksProxy(routes, client, prefix, config.useEnabled) as PrettifyDeep<
    InferHooks<T>
  >;
  const queryKeys = buildQueryKeys(routes, prefix) as PrettifyDeep<InferQueryKeys<T>>;
  const po = buildPreloadOptionsProxy(routes, client, prefix) as PrettifyDeep<
    InferPreloadOptions<T>
  >;

  return { hooks, queryKeys, preloadOptions: po };
}

/**
 * Recursively builds the hooks proxy, walking the router tree in parallel with the client.
 */
function buildHooksProxy(
  routes: RouterConfig,
  client: Record<string, unknown>,
  keyPath: readonly string[],
  useEnabled?: () => boolean,
): Record<string, unknown> {
  const hooks: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(routes)) {
    const currentKeyPath = [...keyPath, key];
    const clientEntry = client[key];

    if (isRouteDefinition(value)) {
      // Leaf route -> create hook object
      if (QUERY_METHODS.has(value.method)) {
        hooks[key] = createQueryHook(
          clientEntry as (...args: unknown[]) => Promise<unknown>,
          currentKeyPath,
          useEnabled,
        );
      } else {
        hooks[key] = createMutationHook(
          clientEntry as (...args: unknown[]) => Promise<unknown>,
          currentKeyPath,
        );
      }
    } else if (isRouterDefinition(value)) {
      // Nested router definition
      hooks[key] = buildHooksProxy(
        value.routes,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
        useEnabled,
      );
    } else if (typeof value === 'object' && value !== null) {
      // Plain object (nested routes)
      hooks[key] = buildHooksProxy(
        value as RouterConfig,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
        useEnabled,
      );
    }
  }

  return hooks;
}

/**
 * Creates a `{ useSWR }` hook object for a GET/HEAD route.
 *
 * SWR uses a null key to disable fetching (no `enabled` option).
 * Any user-provided `enabled` is extracted and converted to the null-key pattern
 * for API consistency with other adapters.
 */
function createQueryHook(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
  keyPath: readonly string[],
  useEnabled?: () => boolean,
): Record<string, unknown> {
  return {
    useSWR: (input?: unknown, options?: Record<string, unknown>) => {
      const globalEnabled = useEnabled?.() ?? true;
      const { enabled: userEnabled, ...restOptions } = (options ?? {}) as {
        enabled?: boolean;
        [key: string]: unknown;
      };

      const isEnabled = globalEnabled && (userEnabled ?? true);
      const queryKey = isEmptyInput(input) ? keyPath : [...keyPath, input];

      // SWR idiom: pass null key to disable fetching
      const swrKey = isEnabled ? queryKey : null;

      return useSWRHook(swrKey, () => clientMethod(input), restOptions);
    },
  };
}

/**
 * Creates a `{ useSWRMutation }` hook object for POST/PUT/PATCH/DELETE routes.
 *
 * SWR mutations require a key (used for cache coordination/deduplication).
 * The fetcher receives `(key, { arg })` — we bridge to `clientMethod(arg)`.
 */
function createMutationHook(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
  keyPath: readonly string[],
): Record<string, unknown> {
  return {
    useSWRMutation: (options?: Record<string, unknown>) => {
      return useSWRMutationHook(
        keyPath,
        (_key: unknown, { arg }: { arg: unknown }) => clientMethod(arg),
        options,
      );
    },
  };
}

/**
 * Recursively builds a preload options proxy. Only includes GET/HEAD routes.
 */
function buildPreloadOptionsProxy(
  routes: RouterConfig,
  client: Record<string, unknown>,
  keyPath: readonly string[],
): Record<string, unknown> {
  const options: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(routes)) {
    const currentKeyPath = [...keyPath, key];
    const clientEntry = client[key];

    if (isRouteDefinition(value)) {
      if (QUERY_METHODS.has(value.method)) {
        options[key] = createPreloadOptionsFactory(
          clientEntry as (...args: unknown[]) => Promise<unknown>,
          currentKeyPath,
        );
      }
    } else if (isRouterDefinition(value)) {
      options[key] = buildPreloadOptionsProxy(
        value.routes,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
      );
    } else if (typeof value === 'object' && value !== null) {
      options[key] = buildPreloadOptionsProxy(
        value as RouterConfig,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
      );
    }
  }

  return options;
}

/**
 * Creates a function that returns `{ key, fetcher }` for a GET/HEAD route.
 * For use with SWR's `preload(key, fetcher)`.
 */
function createPreloadOptionsFactory(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
  keyPath: readonly string[],
): (input?: unknown) => { key: readonly unknown[]; fetcher: () => Promise<unknown> } {
  return (input?: unknown) => {
    const key: readonly unknown[] = isEmptyInput(input) ? keyPath : [...keyPath, input];
    return {
      key,
      fetcher: () => clientMethod(input),
    };
  };
}

/**
 * Checks whether an input object is "empty" (no meaningful properties).
 */
function isEmptyInput(input: unknown): boolean {
  if (input === undefined || input === null) return true;
  if (typeof input !== 'object') return false;
  return Object.keys(input as Record<string, unknown>).length === 0;
}
