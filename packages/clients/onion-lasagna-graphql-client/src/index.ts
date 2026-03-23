/**
 * @fileoverview Type-safe GraphQL client and test utilities for onion-lasagna.
 *
 * @module graphql/client
 *
 * @example GraphQL client
 * ```typescript
 * import { createGraphQLClient } from '@cosmneo/onion-lasagna-graphql-client';
 *
 * const client = createGraphQLClient(schema, {
 *   url: 'http://localhost:4000/graphql',
 * });
 *
 * const user = await client.users.get({ userId: '123' });
 * ```
 *
 * @example Mock client for tests
 * ```typescript
 * import { createMockGraphQLClient } from '@cosmneo/onion-lasagna-graphql-client';
 *
 * const { client, calls } = createMockGraphQLClient(schema, {
 *   users: { get: (input) => ({ id: input.userId, name: 'Alice' }) },
 * });
 * ```
 */

// GraphQL client
export { createGraphQLClient, createBatchQuery } from './create-graphql-client';
export type {
  GraphQLClientConfig,
  GraphQLQueryOptions,
  OutputKeys,
  FieldSelection,
  ApplySelection,
  SelectionOf,
  GraphQLResponseError,
  GraphQLClientMethod,
  InferGraphQLClient,
  BatchQueryEntry,
  BatchQueryFn,
} from './client-types';
export { GraphQLClientError } from './client-types';

// Mock client
export { createMockGraphQLClient, mockGraphQLSequence } from './create-mock-graphql-client';
export type {
  MockGraphQLHandler,
  MockGraphQLHandlers,
  MockGraphQLClientMethod,
  InferMockGraphQLClient,
  MockGraphQLCall,
  MockGraphQLClientResult,
} from './types';
