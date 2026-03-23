/**
 * @fileoverview Types for the GraphQL Yoga adapter.
 *
 * @module graphql/frameworks/yoga/types
 */

import type {
  UnifiedGraphQLField,
  GraphQLHandlerContext,
} from '@cosmneo/onion-lasagna/graphql/server';
import type {
  GraphQLSchemaConfig,
  GraphQLSchemaDefinition,
} from '@cosmneo/onion-lasagna/graphql/field';
import type { MappedGraphQLError } from '@cosmneo/onion-lasagna/graphql/shared';

// Re-export for convenience
export type { UnifiedGraphQLField, GraphQLHandlerContext, MappedGraphQLError, GraphQLSchemaConfig, GraphQLSchemaDefinition };

/**
 * Options for creating the onion-lasagna Yoga server.
 */
export interface CreateOnionYogaOptions {
  /**
   * The fields from `graphqlRoutes().build()`.
   */
  readonly fields: readonly UnifiedGraphQLField[];

  /**
   * The schema definition used to generate typed SDL.
   * When provided, GraphQL field selection is fully supported
   * (e.g., `{ todosList { id title } }`).
   * When omitted, all fields use the `JSON` scalar (no field selection).
   *
   * @example
   * ```typescript
   * createOnionYoga({
   *   fields: graphqlRoutes(schema).build(),
   *   schema, // enables typed SDL
   * })
   * ```
   */
  readonly schema?: GraphQLSchemaConfig | GraphQLSchemaDefinition;

  /**
   * Factory to create GraphQL context from the raw HTTP request.
   * The context is passed to each field handler.
   *
   * This is the recommended place to create request-scoped DataLoaders
   * for N+1 query prevention.
   *
   * @example Basic auth context
   * ```typescript
   * createOnionYoga({
   *   fields,
   *   createContext: async (request) => ({
   *     userId: await extractUserId(request),
   *     requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
   *   }),
   * })
   * ```
   *
   * @example DataLoader for N+1 prevention
   * ```typescript
   * import DataLoader from 'dataloader';
   *
   * createOnionYoga({
   *   fields,
   *   createContext: async (request) => ({
   *     userId: await extractUserId(request),
   *     // Each request gets its own DataLoader instance (request-scoped batching)
   *     userLoader: new DataLoader((ids) => db.users.findMany({ where: { id: { in: ids } } })),
   *     projectLoader: new DataLoader((ids) => db.projects.findMany({ where: { id: { in: ids } } })),
   *   }),
   * })
   * // In handlers: ctx.userLoader.load(userId) — batches within the same request
   * ```
   */
  readonly createContext?: (
    request: Request,
  ) => GraphQLHandlerContext | Promise<GraphQLHandlerContext>;

  /**
   * Envelop plugins to extend Yoga's functionality.
   *
   * Yoga is built on [Envelop](https://the-guild.dev/graphql/envelop), which
   * provides a plugin system for query complexity, depth limiting, persisted
   * queries, APM, and more.
   *
   * @example Query depth limiting
   * ```typescript
   * import { useQueryDepthLimit } from '@envelop/query-depth-limit';
   *
   * createOnionYoga({
   *   fields,
   *   plugins: [useQueryDepthLimit({ maxDepth: 10 })],
   * })
   * ```
   *
   * @example Persisted operations
   * ```typescript
   * import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
   *
   * createOnionYoga({
   *   fields,
   *   plugins: [usePersistedOperations({ store })],
   * })
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly plugins?: readonly any[];

  /**
   * Maximum allowed query depth.
   * Prevents deeply nested queries from consuming excessive resources.
   * Set to `false` to disable (not recommended for production).
   *
   * @default 20
   */
  readonly maxDepth?: number | false;

  /**
   * Called when a resolver throws, **before** the error is mapped to a GraphQL error.
   * Use this to log the original error (including stack trace) that would otherwise
   * be masked in the GraphQL response.
   *
   * @param error - The original error thrown by the field handler
   * @param fieldKey - The dotted field key (e.g., 'tickets.get')
   *
   * @example
   * ```typescript
   * createOnionYoga({
   *   fields,
   *   onResolverError: (error, fieldKey) => {
   *     logger.error(`GraphQL resolver error [${fieldKey}]`, error);
   *   },
   * })
   * ```
   */
  readonly onResolverError?: (error: unknown, fieldKey: string) => void;

  /**
   * Yoga server options (passed through to createYoga).
   */
  readonly yoga?: {
    /** Whether to enable GraphiQL IDE. @default true */
    readonly graphiql?: boolean;
    /** Logging configuration. */
    readonly logging?: boolean | object;
    /** Whether to mask error details in responses. @default false (onion-lasagna handles masking) */
    readonly maskedErrors?: boolean;
  };
}
