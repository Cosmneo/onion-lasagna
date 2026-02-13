/**
 * @fileoverview Factory for creating React Query hooks from router definitions.
 *
 * Builds on top of `createClient` — no HTTP logic is duplicated.
 * GET/HEAD routes get `useQuery`, other methods get `useMutation`.
 *
 * @module unified/react-query/create-react-query-hooks
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import type { RouterConfig, RouterDefinition, PrettifyDeep } from '../route/types';
import { isRouteDefinition, isRouterDefinition } from '../route/types';
import { createClient } from '../client/create-client';
import type { ClientConfig } from '../client/types';
import { buildQueryKeys } from './query-keys';
import type { ReactQueryHooksResult, InferHooks, InferQueryKeys } from './types';

/**
 * HTTP methods that map to `useQuery`.
 */
const QUERY_METHODS = new Set(['GET', 'HEAD']);

/**
 * Creates React Query hooks from a router definition.
 *
 * Reuses `createClient` internally for all HTTP logic.
 * GET/HEAD routes produce `{ useQuery }`, all others produce `{ useMutation }`.
 *
 * @param router - Router definition or router config
 * @param config - Client configuration (baseUrl, headers, etc.)
 * @returns `{ hooks, queryKeys }` — hooks mirror the router structure, queryKeys for cache invalidation
 *
 * @example Basic usage
 * ```typescript
 * import { createReactQueryHooks } from '@cosmneo/onion-lasagna/http/react-query';
 *
 * const { hooks, queryKeys } = createReactQueryHooks(api, {
 *   baseUrl: 'http://localhost:3000',
 * });
 *
 * // GET → useQuery
 * const { data } = hooks.users.list.useQuery({ query: { page: 1 } });
 *
 * // POST → useMutation
 * const mutation = hooks.users.create.useMutation({
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users() }),
 * });
 * mutation.mutate({ body: { name: 'John' } });
 * ```
 */
export function createReactQueryHooks<T extends RouterConfig>(
  router: T | RouterDefinition<T>,
  config: ClientConfig,
): ReactQueryHooksResult<T> {
  const routes = isRouterDefinition(router) ? router.routes : router;

  // Create the underlying HTTP client
  const client = createClient(router, config);

  // Build hooks proxy and query keys
  const hooks = buildHooksProxy(routes, client, []) as PrettifyDeep<InferHooks<T>>;
  const queryKeys = buildQueryKeys(routes) as PrettifyDeep<InferQueryKeys<T>>;

  return { hooks, queryKeys };
}

/**
 * Recursively builds the hooks proxy, walking the router tree in parallel with the client.
 */
function buildHooksProxy(
  routes: RouterConfig,
  client: Record<string, unknown>,
  keyPath: readonly string[],
): Record<string, unknown> {
  const hooks: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(routes)) {
    const currentKeyPath = [...keyPath, key];
    const clientEntry = client[key];

    if (isRouteDefinition(value)) {
      // Leaf route → create hook object
      if (QUERY_METHODS.has(value.method)) {
        hooks[key] = createQueryHook(clientEntry as (...args: unknown[]) => Promise<unknown>, currentKeyPath);
      } else {
        hooks[key] = createMutationHook(clientEntry as (...args: unknown[]) => Promise<unknown>);
      }
    } else if (isRouterDefinition(value)) {
      // Nested router definition
      hooks[key] = buildHooksProxy(
        value.routes,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
      );
    } else if (typeof value === 'object' && value !== null) {
      // Plain object (nested routes)
      hooks[key] = buildHooksProxy(
        value as RouterConfig,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
      );
    }
  }

  return hooks;
}

/**
 * Creates a `{ useQuery }` hook object for a GET/HEAD route.
 */
function createQueryHook(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
  keyPath: readonly string[],
): Record<string, unknown> {
  return {
    useQuery: (input?: unknown, options?: Record<string, unknown>) => {
      const queryKey = isEmptyInput(input) ? keyPath : [...keyPath, input];

      return useQuery({
        queryKey,
        queryFn: () => clientMethod(input),
        ...options,
      });
    },
  };
}

/**
 * Creates a `{ useMutation }` hook object for POST/PUT/PATCH/DELETE routes.
 */
function createMutationHook(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
): Record<string, unknown> {
  return {
    useMutation: (options?: Record<string, unknown>) => {
      return useMutation({
        mutationFn: (input: unknown) => clientMethod(input),
        ...options,
      });
    },
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
