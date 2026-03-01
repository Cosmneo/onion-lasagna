/**
 * @fileoverview Factory for creating Svelte Query hooks from router definitions.
 *
 * Builds on top of `createClient` — no HTTP logic is duplicated.
 * GET/HEAD routes get `createQuery`, other methods get `createMutation`.
 *
 * @module unified/svelte-query/create-svelte-query-hooks
 */

import { createQuery, createMutation } from '@tanstack/svelte-query';
import type {
  RouterConfig,
  RouterDefinition,
  PrettifyDeep,
} from '@cosmneo/onion-lasagna/http/route';
import { isRouteDefinition, isRouterDefinition } from '@cosmneo/onion-lasagna/http/route';
import { createClient } from '@cosmneo/onion-lasagna-client';
import { buildQueryKeys } from './query-keys';
import type {
  SvelteQueryHooksResult,
  SvelteQueryHooksConfig,
  InferHooks,
  InferQueryKeys,
} from './types';

/**
 * HTTP methods that map to `createQuery`.
 */
const QUERY_METHODS = new Set(['GET', 'HEAD']);

/**
 * Creates Svelte Query hooks from a router definition.
 *
 * Reuses `createClient` internally for all HTTP logic.
 * GET/HEAD routes produce `{ createQuery }`, all others produce `{ createMutation }`.
 *
 * @param router - Router definition or router config
 * @param config - Client configuration (baseUrl, headers, etc.) with optional queryKeyPrefix
 * @returns `{ hooks, queryKeys }` — hooks mirror the router structure, queryKeys for cache invalidation
 *
 * @example Basic usage
 * ```typescript
 * import { createSvelteQueryHooks } from '@cosmneo/onion-lasagna-svelte-query';
 *
 * const { hooks, queryKeys } = createSvelteQueryHooks(api, {
 *   baseUrl: 'http://localhost:3000',
 * });
 *
 * // GET -> createQuery
 * const query = hooks.users.list.createQuery({ query: { page: 1 } });
 *
 * // POST -> createMutation
 * const mutation = hooks.users.create.createMutation({
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users() }),
 * });
 * mutation.mutate({ body: { name: 'John' } });
 * ```
 *
 * @example With queryKeyPrefix to prevent cache collisions
 * ```typescript
 * const { hooks: userHooks } = createSvelteQueryHooks(userRouter, {
 *   baseUrl: '/api/users',
 *   queryKeyPrefix: 'users-api',
 * });
 * const { hooks: productHooks } = createSvelteQueryHooks(productRouter, {
 *   baseUrl: '/api/products',
 *   queryKeyPrefix: 'products-api',
 * });
 * // Keys: ['users-api', 'list'] vs ['products-api', 'list']
 * ```
 */
export function createSvelteQueryHooks<T extends RouterConfig>(
  router: T | RouterDefinition<T>,
  config: SvelteQueryHooksConfig,
): SvelteQueryHooksResult<T> {
  const routes = isRouterDefinition(router) ? router.routes : router;
  const prefix = config.queryKeyPrefix ? [config.queryKeyPrefix] : [];

  // Create the underlying HTTP client
  const client = createClient(router, config);

  // Build hooks proxy and query keys (with optional prefix for cache isolation)
  const hooks = buildHooksProxy(routes, client, prefix, config.useEnabled) as PrettifyDeep<
    InferHooks<T>
  >;
  const queryKeys = buildQueryKeys(routes, prefix) as PrettifyDeep<InferQueryKeys<T>>;

  return { hooks, queryKeys };
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
        hooks[key] = createMutationHook(clientEntry as (...args: unknown[]) => Promise<unknown>);
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
 * Creates a `{ createQuery }` hook object for a GET/HEAD route.
 */
function createQueryHook(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
  keyPath: readonly string[],
  useEnabled?: () => boolean,
): Record<string, unknown> {
  return {
    createQuery: (input?: unknown, options?: Record<string, unknown>) => {
      const globalEnabled = useEnabled?.() ?? true;
      const { enabled: userEnabled, ...restOptions } = (options ?? {}) as {
        enabled?: boolean;
        [key: string]: unknown;
      };
      const queryKey = isEmptyInput(input) ? keyPath : [...keyPath, input];

      return createQuery({
        queryKey,
        queryFn: () => clientMethod(input),
        ...restOptions,
        enabled: globalEnabled && (userEnabled ?? true),
      });
    },
  };
}

/**
 * Creates a `{ createMutation }` hook object for POST/PUT/PATCH/DELETE routes.
 */
function createMutationHook(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
): Record<string, unknown> {
  return {
    createMutation: (options?: Record<string, unknown>) => {
      return createMutation({
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
