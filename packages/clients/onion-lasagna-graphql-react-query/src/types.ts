/**
 * @fileoverview Types for the GraphQL React Query hooks adapter.
 *
 * @module graphql/react-query/types
 */

import type {
  UseQueryResult,
  UseQueryOptions,
  UseMutationResult,
  UseMutationOptions,
  QueryOptions,
} from '@tanstack/react-query';
import type {
  GraphQLFieldDefinition,
  GraphQLSchemaConfig,
  GetField,
  InferFieldInput,
  InferFieldOutput,
} from '@cosmneo/onion-lasagna/graphql/field';
import type {
  GraphQLClientConfig,
  GraphQLClientError,
  FieldSelection,
  ApplySelection,
} from '@cosmneo/onion-lasagna-graphql-client';

// ============================================================================
// Hook Input / Output Types
// ============================================================================

/**
 * Extracts the input type from a field definition.
 */
type HookInput<TField extends GraphQLFieldDefinition> = TField['_types']['input'];

/**
 * Extracts the output type from a field definition.
 */
type HookOutput<TField extends GraphQLFieldDefinition> =
  TField['_types']['output'] extends undefined ? void : TField['_types']['output'];

/**
 * Extracts the element type from an output (unwraps arrays).
 */
type OutputElement<T> = T extends readonly (infer E)[] ? E : T;

/**
 * Determines if a field requires input.
 */
type RequiresInput<TField extends GraphQLFieldDefinition> =
  TField['_types']['input'] extends undefined ? false : true;

// ============================================================================
// Query Hook Options
// ============================================================================

/**
 * Options for useQuery hooks.
 * Extends React Query's UseQueryOptions with GraphQL field selection.
 *
 * Note: React Query's `select` (data transform) is omitted to avoid collision
 * with GraphQL field selection. Use `select` here for server-side field narrowing.
 */
export type GraphQLQueryHookOptions<TField extends GraphQLFieldDefinition> = Omit<
  UseQueryOptions<HookOutput<TField>, GraphQLClientError>,
  'queryKey' | 'queryFn' | 'select'
> & {
  /**
   * GraphQL field selection — narrows which fields are requested from the server.
   * When omitted, all fields from the output schema are requested.
   *
   * For narrowed return types, pass with `as const`:
   * ```typescript
   * hooks.todos.list.useQuery(undefined, {
   *   select: ['id', 'title'] as const,
   * })
   * ```
   *
   * @example Flat selection
   * ```typescript
   * hooks.todos.list.useQuery(undefined, { select: ['id', 'title'] })
   * ```
   *
   * @example Nested selection
   * ```typescript
   * hooks.todos.list.useQuery(undefined, {
   *   select: { id: true, category: { label: true } },
   * })
   * ```
   */
  readonly select?: FieldSelection<OutputElement<TField['_types']['output']>>;
};

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Query hooks for a GraphQL query field.
 *
 * Uses overloaded call signatures so that:
 * - No `select` → returns `UseQueryResult<FullOutput>`
 * - With `select: [...] as const` → returns `UseQueryResult<NarrowedOutput>`
 *
 * Note: `as const` (or `satisfies`) is needed on the selection literal for
 * TypeScript to infer the literal type rather than widening to `string[]`.
 */
export type QueryFieldHooks<TField extends GraphQLFieldDefinition> =
  RequiresInput<TField> extends true
    ? {
        useQuery: {
          (
            input: HookInput<TField>,
            options?: Omit<GraphQLQueryHookOptions<TField>, 'select'>,
          ): UseQueryResult<HookOutput<TField>, GraphQLClientError>;
          <S extends FieldSelection<OutputElement<HookOutput<TField>>>>(
            input: HookInput<TField>,
            options: GraphQLQueryHookOptions<TField> & { readonly select: S },
          ): UseQueryResult<ApplySelection<HookOutput<TField>, S>, GraphQLClientError>;
        };
      }
    : {
        useQuery: {
          (
            input?: undefined,
            options?: Omit<GraphQLQueryHookOptions<TField>, 'select'>,
          ): UseQueryResult<HookOutput<TField>, GraphQLClientError>;
          <S extends FieldSelection<OutputElement<HookOutput<TField>>>>(
            input: undefined,
            options: GraphQLQueryHookOptions<TField> & { readonly select: S },
          ): UseQueryResult<ApplySelection<HookOutput<TField>, S>, GraphQLClientError>;
        };
      };

/**
 * Mutation hooks for a GraphQL mutation field.
 */
export interface MutationFieldHooks<TField extends GraphQLFieldDefinition> {
  useMutation: (
    options?: Omit<
      UseMutationOptions<HookOutput<TField>, GraphQLClientError, HookInput<TField>>,
      'mutationFn'
    >,
  ) => UseMutationResult<HookOutput<TField>, GraphQLClientError, HookInput<TField>>;
}

/**
 * Recursively builds the hooks type from a schema config.
 */
export type InferGraphQLHooks<T extends GraphQLSchemaConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: T[K] extends GraphQLFieldDefinition<any, any, any, any>
    ? T[K]['_types']['operation'] extends 'query'
      ? QueryFieldHooks<T[K]>
      : MutationFieldHooks<T[K]>
    : T[K] extends GraphQLSchemaConfig
      ? InferGraphQLHooks<T[K]>
      : never;
};

// ============================================================================
// Query Key Types
// ============================================================================

/**
 * Query key function for a single field.
 * Returns the key path, optionally appending input.
 */
export type QueryKeyFn<TField extends GraphQLFieldDefinition> =
  RequiresInput<TField> extends true
    ? (input: HookInput<TField>) => readonly unknown[]
    : (input?: HookInput<TField>) => readonly unknown[];

/**
 * Recursively builds query key types from a schema config.
 */
export type InferGraphQLQueryKeys<T extends GraphQLSchemaConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: T[K] extends GraphQLFieldDefinition<any, any, any, any>
    ? QueryKeyFn<T[K]>
    : T[K] extends GraphQLSchemaConfig
      ? (() => readonly string[]) & InferGraphQLQueryKeys<T[K]>
      : never;
};

// ============================================================================
// Query Options Types
// ============================================================================

/**
 * Query options function for a single query field.
 * Returns a `queryOptions({ queryKey, queryFn })` object for use with
 * `queryClient.ensureQueryData()`, `queryClient.prefetchQuery()`,
 * or `useSuspenseQuery()` outside of the generated hooks.
 *
 * @example Route loader prefetching
 * ```typescript
 * export const Route = createFileRoute('/users')({
 *   loader: ({ context }) =>
 *     context.queryClient.ensureQueryData(qo.users.list({ page: 1, pageSize: 50 })),
 * })
 * ```
 */
export type QueryOptionsFn<TField extends GraphQLFieldDefinition> =
  RequiresInput<TField> extends true
    ? (input: HookInput<TField>) => QueryOptions<HookOutput<TField>, GraphQLClientError>
    : (input?: HookInput<TField>) => QueryOptions<HookOutput<TField>, GraphQLClientError>;

/**
 * Recursively builds query options types from a schema config.
 * Only includes query fields (mutations are excluded).
 */
export type InferGraphQLQueryOptions<T extends GraphQLSchemaConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: T[K] extends GraphQLFieldDefinition<any, any, any, any>
    ? T[K]['_types']['operation'] extends 'query'
      ? QueryOptionsFn<T[K]>
      : never
    : T[K] extends GraphQLSchemaConfig
      ? InferGraphQLQueryOptions<T[K]>
      : never;
};

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for creating GraphQL React Query hooks.
 * Extends GraphQLClientConfig with React Query-specific options.
 */
export interface GraphQLReactQueryConfig extends GraphQLClientConfig {
  /**
   * Prefix for all generated query keys.
   * Useful for cache isolation when multiple hook instances share a QueryClient.
   *
   * @example
   * ```typescript
   * const { hooks: todoHooks } = createGraphQLReactQueryHooks(todoSchema, {
   *   url: '/graphql',
   *   queryKeyPrefix: 'todos-api',
   * });
   * // Keys: ['todos-api', 'todos', 'list']
   * ```
   */
  readonly queryKeyPrefix?: string;

  /**
   * Hook that gates all queries globally.
   * Called inside every `useQuery` hook (valid React Hooks rules).
   * AND-ed with per-query `enabled` option.
   *
   * @example Gate on auth session
   * ```typescript
   * const { hooks } = createGraphQLReactQueryHooks(schema, {
   *   url: '/graphql',
   *   useEnabled: () => {
   *     const { isValid } = useValidSession();
   *     return isValid;
   *   },
   * });
   * ```
   */
  readonly useEnabled?: () => boolean;
}

// ============================================================================
// Compound Query Types
// ============================================================================

/**
 * Filters schema keys to only include query fields (excludes mutations).
 * Used to enforce compile-time safety: batch queries cannot include mutations.
 */
type QuerySchemaKeys<
  T extends GraphQLSchemaConfig,
  Prefix extends string = '',
> = T extends GraphQLSchemaConfig
  ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [K in keyof T]: T[K] extends GraphQLFieldDefinition<any, any, any, any>
        ? T[K]['_types']['operation'] extends 'query'
          ? `${Prefix}${K & string}`
          : never
        : T[K] extends GraphQLSchemaConfig
          ? QuerySchemaKeys<T[K], `${Prefix}${K & string}.`>
          : never;
    }[keyof T]
  : never;

/**
 * Config for a single entry in a compound query.
 * Only query fields are allowed — mutations are rejected at compile time.
 */
export interface CompoundQueryEntry<
  T extends GraphQLSchemaConfig,
  K extends QuerySchemaKeys<T> = QuerySchemaKeys<T>,
> {
  readonly field: K;
  readonly input?: InferFieldInput<GetField<T, K>>;
  readonly select?: FieldSelection<OutputElement<InferFieldOutput<GetField<T, K>>>>;
}

/**
 * Config object for useGraphQLQuery. Keys are aliases, values are entries.
 */
export type CompoundQueryConfig<T extends GraphQLSchemaConfig> = Record<
  string,
  CompoundQueryEntry<T, QuerySchemaKeys<T>>
>;

/**
 * Infers the result type per entry: applies selection if present, otherwise full output.
 */
export type CompoundQueryResult<
  T extends GraphQLSchemaConfig,
  C extends Record<string, { field: string; select?: unknown }>,
> = {
  [K in keyof C]: C[K]['field'] extends QuerySchemaKeys<T>
    ? C[K] extends { select: infer S }
      ? S extends FieldSelection<OutputElement<InferFieldOutput<GetField<T, C[K]['field']>>>>
        ? ApplySelection<InferFieldOutput<GetField<T, C[K]['field']>>, S>
        : InferFieldOutput<GetField<T, C[K]['field']>>
      : InferFieldOutput<GetField<T, C[K]['field']>>
    : unknown;
};

/**
 * Options for useGraphQLQuery.
 */
export interface CompoundQueryOptions {
  readonly enabled?: boolean;
  readonly staleTime?: number;
  readonly gcTime?: number;
  readonly refetchInterval?: number | false;
  readonly refetchOnWindowFocus?: boolean;
}

/**
 * The useGraphQLQuery hook type.
 */
export type UseGraphQLQueryHook<T extends GraphQLSchemaConfig> = <
  const C extends CompoundQueryConfig<T>,
>(
  config: C,
  options?: CompoundQueryOptions,
) => UseQueryResult<CompoundQueryResult<T, C>, GraphQLClientError>;

// ============================================================================
// Result
// ============================================================================

/**
 * Result of `createGraphQLReactQueryHooks()`.
 */
export interface GraphQLReactQueryResult<T extends GraphQLSchemaConfig> {
  /** Type-safe hooks matching the schema structure. */
  readonly hooks: InferGraphQLHooks<T>;
  /** Query key functions for cache management. */
  readonly queryKeys: InferGraphQLQueryKeys<T>;
  /** Query options functions for use with `ensureQueryData`, `prefetchQuery`, or `useSuspenseQuery`. */
  readonly queryOptions: InferGraphQLQueryOptions<T>;
  /** Compound query hook for batching multiple fields into a single request. */
  readonly useGraphQLQuery: UseGraphQLQueryHook<T>;
}
