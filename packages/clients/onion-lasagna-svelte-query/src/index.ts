/**
 * @fileoverview Svelte Query integration for the unified route system.
 *
 * Provides type-safe Svelte Query hooks built on top of `createClient`.
 * GET/HEAD routes get `createQuery`, other methods get `createMutation`.
 *
 * @module unified/svelte-query
 *
 * @example
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
 * const mutation = hooks.users.create.createMutation();
 * mutation.mutate({ body: { name: 'John' } });
 *
 * // Query keys for cache invalidation
 * queryClient.invalidateQueries({ queryKey: queryKeys.users() });
 * ```
 */

export { createSvelteQueryHooks } from './create-svelte-query-hooks';
export type {
  QueryRouteHooks,
  MutationRouteHooks,
  InferHooks,
  QueryKeyFn,
  QueryKeyNamespace,
  InferQueryKeys,
  SvelteQueryHooksResult,
  SvelteQueryHooksConfig,
  HookRequestInput,
  HookResponse,
} from './types';
export { ClientError } from './types';
