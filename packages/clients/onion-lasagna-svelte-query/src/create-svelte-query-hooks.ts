/**
 * @fileoverview Factory for creating Svelte Query hooks from router definitions.
 *
 * Builds on top of `createClient` — no HTTP logic is duplicated.
 * GET/HEAD routes get `createQuery`, other methods get `createMutation`.
 *
 * @module unified/svelte-query/create-svelte-query-hooks
 */

import { createQuery, createMutation, queryOptions } from '@tanstack/svelte-query';
import { derived, readable, get } from 'svelte/store';
import type { Readable } from 'svelte/store';
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
  InferQueryOptions,
} from './types';

/**
 * HTTP methods that map to `createQuery`.
 */
const QUERY_METHODS = new Set(['GET', 'HEAD']);

/**
 * Checks whether a value is a Svelte readable store (has a `subscribe` function).
 * Mirrors the `isSvelteStore` check in `@tanstack/svelte-query/createBaseQuery`.
 */
function isSvelteStore<T>(value: unknown): value is Readable<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'subscribe' in value &&
    typeof (value as Record<string, unknown>)['subscribe'] === 'function'
  );
}

/**
 * Normalises a `StoreOrVal<T>` to a `Readable<T>`.
 * Plain values are lifted into a `readable()` store; stores are returned as-is.
 */
function toReadable<T>(value: T | Readable<T>): Readable<T> {
  return isSvelteStore<T>(value) ? value : readable(value);
}

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
 *
 * @example Reactive auth gate via store
 * ```typescript
 * const sessionValid = writable(false);
 * const { hooks } = createSvelteQueryHooks(router, {
 *   baseUrl: '/api',
 *   useEnabled: () => sessionValid, // returns Readable<boolean>
 * });
 * // Queries are disabled until sessionValid is set to true
 * sessionValid.set(true);
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

  // Build hooks proxy, query keys, and query options (with optional prefix for cache isolation)
  const hooks = buildHooksProxy(routes, client, prefix, config.useEnabled) as PrettifyDeep<
    InferHooks<T>
  >;
  const queryKeys = buildQueryKeys(routes, prefix) as PrettifyDeep<InferQueryKeys<T>>;
  const qo = buildQueryOptionsProxy(routes, client, prefix) as PrettifyDeep<InferQueryOptions<T>>;

  return { hooks, queryKeys, queryOptions: qo };
}

/**
 * Recursively builds the hooks proxy, walking the router tree in parallel with the client.
 */
function buildHooksProxy(
  routes: RouterConfig,
  client: Record<string, unknown>,
  keyPath: readonly string[],
  useEnabled?: () => boolean | Readable<boolean>,
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
 *
 * The options object passed to `createQuery` is a Svelte `derived` store so that
 * `@tanstack/svelte-query` will subscribe to it via the `isSvelteStore` branch in
 * `createBaseQuery`. This means:
 *
 *  - When `input` is a `Readable<unknown>` store, the queryKey and queryFn update
 *    whenever the store emits a new value (P05-1: reactive input).
 *
 *  - When `options.enabled` is a `Readable<boolean>` store, the enabled flag tracks
 *    the store's current value (P05-1: reactive per-query enabled).
 *
 *  - When `useEnabled` returns a `Readable<boolean>`, the global gate is also reactive
 *    (P05-1: auth-gate re-enables automatically).
 *
 *  - When plain values are supplied the behaviour is identical to before — the derived
 *    store's initial snapshot equals the static value and never changes.
 */
function createQueryHook(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
  keyPath: readonly string[],
  useEnabled?: () => boolean | Readable<boolean>,
): Record<string, unknown> {
  return {
    createQuery: (
      inputOrStore?: unknown | Readable<unknown>,
      options?: { enabled?: boolean | Readable<boolean>; [key: string]: unknown },
    ) => {
      const { enabled: userEnabledOption, ...restOptions } = (options ?? {}) as {
        enabled?: boolean | Readable<boolean>;
        [key: string]: unknown;
      };

      // Resolve the global enabled gate to a store.
      // useEnabled() may return a plain boolean OR a Readable<boolean>.
      const globalEnabledRaw = useEnabled ? useEnabled() : true;
      const globalEnabledStore: Readable<boolean> = toReadable(globalEnabledRaw);

      // Resolve per-query enabled to a store.
      const userEnabledStore: Readable<boolean> = toReadable(
        userEnabledOption !== undefined ? userEnabledOption : true,
      );

      // Resolve input to a store so that a reactive input triggers re-derivation.
      const inputStore: Readable<unknown> = toReadable(inputOrStore);

      // Build a reactive options store. `createBaseQuery` detects it via `isSvelteStore`
      // and subscribes, so every emission causes the observer's options to be updated.
      const optionsStore: Readable<Record<string, unknown>> = derived(
        [inputStore, globalEnabledStore, userEnabledStore],
        ([$input, $globalEnabled, $userEnabled]) => {
          const queryKey = isEmptyInput($input) ? keyPath : [...keyPath, $input];
          return {
            queryKey,
            // P05-3: thread the AbortSignal provided by Svelte Query to the underlying client.
            queryFn: ({ signal }: { signal?: AbortSignal }) => clientMethod($input, { signal }),
            ...restOptions,
            enabled: $globalEnabled && $userEnabled,
          };
        },
      );

      return createQuery(optionsStore as Readable<Parameters<typeof createQuery>[0]>);
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
 * Recursively builds a query options proxy. Only includes GET/HEAD routes.
 */
function buildQueryOptionsProxy(
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
        options[key] = createQueryOptionsFactory(
          clientEntry as (...args: unknown[]) => Promise<unknown>,
          currentKeyPath,
        );
      }
    } else if (isRouterDefinition(value)) {
      options[key] = buildQueryOptionsProxy(
        value.routes,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
      );
    } else if (typeof value === 'object' && value !== null) {
      options[key] = buildQueryOptionsProxy(
        value as RouterConfig,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
      );
    }
  }

  return options;
}

/**
 * Creates a function that returns `queryOptions({ queryKey, queryFn })` for a GET/HEAD route.
 *
 * Note: `queryOptions` is used for SSR prefetching / `ensureQueryData` where a static snapshot
 * is appropriate. It intentionally accepts plain values (not stores) because it is not called
 * inside a Svelte component's reactive context.
 */
function createQueryOptionsFactory(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
  keyPath: readonly string[],
): (input?: unknown) => ReturnType<typeof queryOptions> {
  return (input?: unknown) => {
    // For queryOptions factories, resolve a store to its current value if one is passed.
    const resolvedInput = isSvelteStore(input) ? get(input) : input;
    const queryKey: readonly unknown[] = isEmptyInput(resolvedInput)
      ? keyPath
      : [...keyPath, resolvedInput];
    return queryOptions({
      queryKey,
      // P05-3: thread the AbortSignal provided by Svelte Query to the underlying client.
      queryFn: ({ signal }: { signal?: AbortSignal }) => clientMethod(resolvedInput, { signal }),
    });
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
