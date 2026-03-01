/**
 * @fileoverview Vue Query integration for the unified route system.
 *
 * Provides type-safe Vue Query hooks built on top of `createClient`.
 * GET/HEAD routes get `useQuery`, other methods get `useMutation`.
 *
 * @module unified/vue-query
 *
 * @example
 * ```typescript
 * import { createVueQueryHooks } from '@cosmneo/onion-lasagna-vue-query';
 *
 * const { hooks, queryKeys } = createVueQueryHooks(api, {
 *   baseUrl: 'http://localhost:3000',
 * });
 *
 * // GET -> useQuery
 * const { data } = hooks.users.list.useQuery({ query: { page: 1 } });
 *
 * // POST -> useMutation
 * const mutation = hooks.users.create.useMutation();
 * mutation.mutate({ body: { name: 'John' } });
 *
 * // Query keys for cache invalidation
 * queryClient.invalidateQueries({ queryKey: queryKeys.users() });
 * ```
 */

export { createVueQueryHooks } from './create-vue-query-hooks';
export type {
  QueryRouteHooks,
  MutationRouteHooks,
  InferHooks,
  QueryKeyFn,
  QueryKeyNamespace,
  InferQueryKeys,
  VueQueryHooksResult,
  VueQueryHooksConfig,
  HookRequestInput,
  HookResponse,
} from './types';
export { ClientError } from './types';
