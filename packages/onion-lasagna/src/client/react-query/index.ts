/**
 * React Query Integration for Typed HTTP Client
 *
 * Create type-safe React Query hooks from typed clients.
 *
 * @example
 * ```typescript
 * import { createTypedClient, defineTypedRouter, defineTypedRoute } from '@cosmneo/onion-lasagna/client';
 * import { createTypedHooks } from '@cosmneo/onion-lasagna/client/react-query';
 *
 * // Create client and router
 * const router = defineTypedRouter({ ... });
 * const client = createTypedClient(router, { baseUrl: 'http://localhost:3000' });
 *
 * // Create hooks
 * const { hooks, queryKeys } = createTypedHooks(client, router);
 *
 * // Use in components
 * function MyComponent() {
 *   const { data } = hooks.projects.list.useQuery({ queryParams: { page: '1' } });
 *   const mutation = hooks.projects.create.useMutation({
 *     onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() }),
 *   });
 * }
 * ```
 *
 * @packageDocumentation
 */

export { createTypedHooks } from './create-typed-hooks';

export type {
  TypedUseQuery,
  TypedUseMutation,
  InferRouteHook,
  InferTypedHooks,
  QueryKey,
  RouteQueryKeyFactory,
  InferRouteQueryKeyFactory,
  InferQueryKeys,
  TypedHooksResult,
} from './types';
