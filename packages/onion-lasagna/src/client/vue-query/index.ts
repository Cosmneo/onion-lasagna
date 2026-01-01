/**
 * Vue Query Integration for Typed HTTP Client
 *
 * Create type-safe Vue Query composables from typed clients.
 *
 * @example
 * ```typescript
 * import { createTypedClient, defineRouterContract } from '@cosmneo/onion-lasagna/client';
 * import { createTypedComposables } from '@cosmneo/onion-lasagna/client/vue-query';
 *
 * // Create client and router
 * const router = defineRouterContract({ ... });
 * const client = createTypedClient(router, { baseUrl: 'http://localhost:3000' });
 *
 * // Create composables
 * const { composables, queryKeys } = createTypedComposables(client, router);
 *
 * // Use in Vue components
 * <script setup>
 * const { data, isLoading } = composables.projects.list.useQuery({ queryParams: { page: '1' } });
 * const { mutate } = composables.projects.create.useMutation({
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() }),
 * });
 * </script>
 * ```
 *
 * @packageDocumentation
 */

export { createTypedComposables } from './create-typed-composables';

export type {
  TypedUseQuery,
  TypedUseMutation,
  InferRouteComposable,
  InferTypedComposables,
  QueryKey,
  RouteQueryKeyFactory,
  InferRouteQueryKeyFactory,
  InferQueryKeys,
  TypedComposablesResult,
} from './types';
