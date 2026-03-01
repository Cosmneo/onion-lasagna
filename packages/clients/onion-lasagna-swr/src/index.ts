/**
 * @fileoverview SWR integration for the unified route system.
 *
 * Provides type-safe SWR hooks built on top of `createClient`.
 * GET/HEAD routes get `useSWR`, other methods get `useSWRMutation`.
 *
 * @module unified/swr
 *
 * @example
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
 *
 * // Query keys for cache invalidation
 * import { useSWRConfig } from 'swr';
 * const { mutate } = useSWRConfig();
 * mutate(queryKeys.users());
 * ```
 */

export { createSWRHooks } from './create-swr-hooks';
export type {
  QueryRouteHooks,
  MutationRouteHooks,
  InferHooks,
  QueryKeyFn,
  QueryKeyNamespace,
  InferQueryKeys,
  SWRHooksResult,
  SWRHooksConfig,
  HookRequestInput,
  HookResponse,
} from './types';
export { ClientError } from './types';
