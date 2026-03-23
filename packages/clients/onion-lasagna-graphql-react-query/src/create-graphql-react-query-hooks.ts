/**
 * @fileoverview Factory for generating React Query hooks from GraphQL schema definitions.
 *
 * @module graphql/react-query/create-hooks
 */

import { useQuery, useMutation, queryOptions } from '@tanstack/react-query';
import type {
  GraphQLSchemaConfig,
  GraphQLSchemaDefinition,
} from '@cosmneo/onion-lasagna/graphql/field';
import { isFieldDefinition, isSchemaDefinition } from '@cosmneo/onion-lasagna/graphql/field';
import { createGraphQLClient, createBatchQuery } from '@cosmneo/onion-lasagna-graphql-client';
import type { BatchQueryEntry } from '@cosmneo/onion-lasagna-graphql-client';
import { buildGraphQLQueryKeys } from './query-keys';
import type {
  GraphQLReactQueryConfig,
  GraphQLReactQueryResult,
  InferGraphQLHooks,
  InferGraphQLQueryKeys,
  InferGraphQLQueryOptions,
  CompoundQueryConfig,
  CompoundQueryOptions,
  UseGraphQLQueryHook,
} from './types';

/**
 * Creates type-safe React Query hooks from a GraphQL schema definition.
 *
 * Query fields (`defineQuery`) generate `useQuery` hooks.
 * Mutation fields (`defineMutation`) generate `useMutation` hooks.
 *
 * @param schema - GraphQL schema definition or config
 * @param config - Client config + React Query options
 * @returns `{ hooks, queryKeys }` — type-safe hooks and cache key functions
 *
 * @example Basic usage
 * ```typescript
 * import { createGraphQLReactQueryHooks } from '@cosmneo/onion-lasagna-graphql-react-query';
 *
 * const { hooks, queryKeys } = createGraphQLReactQueryHooks(todoSchema, {
 *   url: 'http://localhost:4000/graphql',
 * });
 *
 * // In components:
 * const { data: todos } = hooks.todos.list.useQuery();
 * const { mutate } = hooks.todos.create.useMutation();
 * ```
 *
 * @example With auth gating
 * ```typescript
 * const { hooks } = createGraphQLReactQueryHooks(schema, {
 *   url: '/graphql',
 *   headers: () => ({ Authorization: `Bearer ${getToken()}` }),
 *   useEnabled: () => useSession().isAuthenticated,
 * });
 * // All queries disabled until authenticated
 * ```
 */
export function createGraphQLReactQueryHooks<T extends GraphQLSchemaConfig>(
  schema: T | GraphQLSchemaDefinition<T>,
  config: GraphQLReactQueryConfig,
): GraphQLReactQueryResult<T> {
  const fields = isSchemaDefinition(schema) ? schema.fields : schema;
  const client = createGraphQLClient(schema, config);
  const batchQueryFn = createBatchQuery(schema, config);
  const prefix = config.queryKeyPrefix ? [config.queryKeyPrefix] : [];

  return {
    hooks: buildHooksProxy(
      fields,
      client as Record<string, unknown>,
      prefix,
      config.useEnabled,
    ) as InferGraphQLHooks<T>,
    queryKeys: buildGraphQLQueryKeys(schema, prefix) as InferGraphQLQueryKeys<T>,
    queryOptions: buildQueryOptionsProxy(
      fields,
      client as Record<string, unknown>,
      prefix,
    ) as InferGraphQLQueryOptions<T>,
    useGraphQLQuery: createCompoundQueryHook(
      batchQueryFn,
      config.useEnabled,
    ) as UseGraphQLQueryHook<T>,
  };
}

/**
 * Recursively builds a hooks proxy from schema config and client.
 */
function buildHooksProxy(
  config: GraphQLSchemaConfig,
  client: Record<string, unknown>,
  keyPath: readonly string[],
  useEnabled?: () => boolean,
): Record<string, unknown> {
  const hooks: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    const currentKeyPath = [...keyPath, key];
    const clientEntry = client[key];

    if (isFieldDefinition(value)) {
      if (value.operation === 'query') {
        hooks[key] = createQueryHook(
          clientEntry as (...args: unknown[]) => Promise<unknown>,
          currentKeyPath,
          useEnabled,
        );
      } else {
        hooks[key] = createMutationHook(clientEntry as (...args: unknown[]) => Promise<unknown>);
      }
    } else if (isSchemaDefinition(value)) {
      hooks[key] = buildHooksProxy(
        value.fields,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
        useEnabled,
      );
    } else if (typeof value === 'object' && value !== null) {
      hooks[key] = buildHooksProxy(
        value as GraphQLSchemaConfig,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
        useEnabled,
      );
    }
  }

  return hooks;
}

/**
 * Creates a `{ useQuery }` hook for a query field.
 */
function createQueryHook(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
  keyPath: readonly string[],
  useEnabled?: () => boolean,
): Record<string, unknown> {
  return {
    useQuery: (input?: unknown, options?: Record<string, unknown>) => {
      // Call useEnabled unconditionally (React Hooks rules)
      const globalEnabled = useEnabled?.() ?? true;

      const {
        enabled: userEnabled,
        select,
        ...restOptions
      } = (options ?? {}) as Record<string, unknown>;

      // Build query key — append input only if non-empty
      const queryKey = isEmptyInput(input) ? keyPath : [...keyPath, input];

      return useQuery({
        queryKey,
        queryFn: () => clientMethod(input, select ? { select } : undefined),
        ...restOptions,
        enabled: globalEnabled && ((userEnabled as boolean | undefined) ?? true),
      });
    },
  };
}

/**
 * Creates a `{ useMutation }` hook for a mutation field.
 */
function createMutationHook(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
): Record<string, unknown> {
  return {
    useMutation: (options?: Record<string, unknown>) => {
      return useMutation({
        mutationFn: (input: unknown) => clientMethod(input),
        ...(options ?? {}),
      });
    },
  };
}

/**
 * Creates the compound query hook (`useGraphQLQuery`).
 * Batches multiple schema fields into a single HTTP request.
 */
function createCompoundQueryHook(
  batchQueryFn: (entries: Record<string, BatchQueryEntry>) => Promise<Record<string, unknown>>,
  useEnabled?: () => boolean,
): (config: CompoundQueryConfig<GraphQLSchemaConfig>, options?: CompoundQueryOptions) => unknown {
  return (config: CompoundQueryConfig<GraphQLSchemaConfig>, options?: CompoundQueryOptions) => {
    const globalEnabled = useEnabled?.() ?? true;

    // Stable query key: sorted aliases + their field/input
    const queryKey = [
      'compound',
      ...Object.keys(config)
        .sort()
        .map((alias) => ({
          alias,
          field: config[alias]!.field,
          input: config[alias]!.input,
        })),
    ];

    // Convert config to BatchQueryEntry format
    const entries: Record<string, BatchQueryEntry> = {};
    for (const [alias, entry] of Object.entries(config)) {
      entries[alias] = {
        fieldKey: entry.field,
        input: entry.input,
        select: entry.select,
      };
    }

    return useQuery({
      queryKey,
      queryFn: () => batchQueryFn(entries),
      ...options,
      enabled: globalEnabled && (options?.enabled ?? true),
    });
  };
}

/**
 * Recursively builds a query options proxy from schema config and client.
 * Mirrors `buildHooksProxy` but returns `queryOptions()` objects instead of hooks.
 */
function buildQueryOptionsProxy(
  config: GraphQLSchemaConfig,
  client: Record<string, unknown>,
  keyPath: readonly string[],
): Record<string, unknown> {
  const options: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    const currentKeyPath = [...keyPath, key];
    const clientEntry = client[key];

    if (isFieldDefinition(value)) {
      if (value.operation === 'query') {
        options[key] = createQueryOptionsFactory(
          clientEntry as (...args: unknown[]) => Promise<unknown>,
          currentKeyPath,
        );
      }
      // Mutations are intentionally excluded
    } else if (isSchemaDefinition(value)) {
      options[key] = buildQueryOptionsProxy(
        value.fields,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
      );
    } else if (typeof value === 'object' && value !== null) {
      options[key] = buildQueryOptionsProxy(
        value as GraphQLSchemaConfig,
        clientEntry as Record<string, unknown>,
        currentKeyPath,
      );
    }
  }

  return options;
}

/**
 * Creates a function that returns `queryOptions({ queryKey, queryFn })` for a query field.
 * Uses the same key/fn logic as `createQueryHook` to ensure cache hits.
 */
function createQueryOptionsFactory(
  clientMethod: (...args: unknown[]) => Promise<unknown>,
  keyPath: readonly string[],
): (input?: unknown) => ReturnType<typeof queryOptions> {
  return (input?: unknown) => {
    const queryKey: readonly unknown[] = isEmptyInput(input) ? keyPath : [...keyPath, input];
    return queryOptions({
      queryKey,
      queryFn: () => clientMethod(input),
    });
  };
}

/**
 * Checks if an input value is empty (undefined, null, or empty object).
 * Empty inputs are not appended to query keys to avoid unnecessary cache busting.
 */
function isEmptyInput(input: unknown): boolean {
  if (input === undefined || input === null) return true;
  if (typeof input !== 'object') return false;
  return Object.keys(input as Record<string, unknown>).length === 0;
}
