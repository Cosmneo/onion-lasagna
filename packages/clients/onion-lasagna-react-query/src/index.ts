/**
 * @fileoverview React Query integration for the unified route system.
 *
 * Provides type-safe React Query hooks built on top of `createClient`.
 * GET/HEAD routes get `useQuery`, other methods get `useMutation`.
 *
 * @module unified/react-query
 *
 * @example
 * ```typescript
 * import { createReactQueryHooks } from '@cosmneo/onion-lasagna-react-query';
 *
 * const { hooks, queryKeys } = createReactQueryHooks(api, {
 *   baseUrl: 'http://localhost:3000',
 * });
 *
 * // GET → useQuery
 * const { data } = hooks.users.list.useQuery({ query: { page: 1 } });
 *
 * // POST → useMutation
 * const mutation = hooks.users.create.useMutation();
 * mutation.mutate({ body: { name: 'John' } });
 *
 * // Query keys for cache invalidation
 * queryClient.invalidateQueries({ queryKey: queryKeys.users() });
 * ```
 */

export { createReactQueryHooks } from './create-react-query-hooks';
export type {
  QueryRouteHooks,
  MutationRouteHooks,
  InferHooks,
  QueryKeyFn,
  QueryKeyNamespace,
  InferQueryKeys,
  ReactQueryHooksResult,
  ReactQueryHooksConfig,
  HookRequestInput,
  HookResponse,
} from './types';
export { ClientError } from './types';
