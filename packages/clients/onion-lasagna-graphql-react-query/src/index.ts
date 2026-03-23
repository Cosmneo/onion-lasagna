/**
 * @fileoverview React Query hooks for onion-lasagna GraphQL schemas.
 *
 * @module graphql/react-query
 *
 * @example
 * ```typescript
 * import { createGraphQLReactQueryHooks } from '@cosmneo/onion-lasagna-graphql-react-query';
 *
 * const { hooks, queryKeys } = createGraphQLReactQueryHooks(todoSchema, {
 *   url: 'http://localhost:4000/graphql',
 * });
 *
 * // In components:
 * const { data } = hooks.todos.list.useQuery();
 * const { mutate } = hooks.todos.create.useMutation();
 *
 * // Cache invalidation:
 * queryClient.invalidateQueries({ queryKey: queryKeys.todos() });
 * ```
 */

export { createGraphQLReactQueryHooks } from './create-graphql-react-query-hooks';
export { buildGraphQLQueryKeys } from './query-keys';
export type {
  GraphQLReactQueryConfig,
  GraphQLReactQueryResult,
  GraphQLQueryHookOptions,
  QueryFieldHooks,
  MutationFieldHooks,
  InferGraphQLHooks,
  QueryKeyFn,
  InferGraphQLQueryKeys,
  QueryOptionsFn,
  InferGraphQLQueryOptions,
  CompoundQueryEntry,
  CompoundQueryConfig,
  CompoundQueryResult,
  CompoundQueryOptions,
  UseGraphQLQueryHook,
} from './types';
