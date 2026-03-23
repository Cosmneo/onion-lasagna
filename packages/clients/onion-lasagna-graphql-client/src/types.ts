/**
 * @fileoverview Types for the mock GraphQL client.
 *
 * @module graphql/client/mock-types
 */

import type {
  GraphQLFieldDefinition,
  GraphQLSchemaConfig,
} from '@cosmneo/onion-lasagna/graphql/field';

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Determines if a field requires input.
 */
type RequiresInput<TField extends GraphQLFieldDefinition> =
  TField['_types']['input'] extends undefined ? false : true;

/**
 * A mock handler function for a single field.
 */
export type MockGraphQLHandler<TField extends GraphQLFieldDefinition> =
  RequiresInput<TField> extends true
    ? (input: TField['_types']['input']) => TField['_types']['output'] | Promise<TField['_types']['output']>
    : (input?: undefined) => TField['_types']['output'] | Promise<TField['_types']['output']>;

/**
 * Recursively maps a schema config to mock handler objects.
 * Handlers are optional — only mock the fields you test.
 */
export type MockGraphQLHandlers<T extends GraphQLSchemaConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]?: T[K] extends GraphQLFieldDefinition<any, any, any, any>
    ? MockGraphQLHandler<T[K]>
    : T[K] extends GraphQLSchemaConfig
      ? MockGraphQLHandlers<T[K]>
      : never;
};

// ============================================================================
// Mock Client Types
// ============================================================================

/**
 * A mock client method for a single field.
 */
export type MockGraphQLClientMethod<TField extends GraphQLFieldDefinition> =
  RequiresInput<TField> extends true
    ? (input: TField['_types']['input']) => Promise<TField['_types']['output']>
    : (input?: undefined) => Promise<TField['_types']['output']>;

/**
 * Recursively builds the mock client type from a schema config.
 */
export type InferMockGraphQLClient<T extends GraphQLSchemaConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: T[K] extends GraphQLFieldDefinition<any, any, any, any>
    ? MockGraphQLClientMethod<T[K]>
    : T[K] extends GraphQLSchemaConfig
      ? InferMockGraphQLClient<T[K]>
      : never;
};

// ============================================================================
// Call Recording
// ============================================================================

/**
 * A recorded mock client call.
 */
export interface MockGraphQLCall {
  /** Dot-separated field key (e.g. "users.get") */
  readonly field: string;
  /** The input passed to the mock method */
  readonly input: unknown;
  /** The response returned by the handler */
  readonly response: unknown;
  /** Timestamp of the call */
  readonly timestamp: number;
}

/**
 * Result of `createMockGraphQLClient()`.
 */
export interface MockGraphQLClientResult<T extends GraphQLSchemaConfig> {
  /** Mock client with the same shape as `createGraphQLClient` output */
  readonly client: InferGraphQLClient<T>;
  /** All recorded calls in order */
  readonly calls: MockGraphQLCall[];
  /** Filter calls by dot-separated field key */
  readonly callsFor: (field: string) => MockGraphQLCall[];
  /** Clear all recorded calls */
  readonly reset: () => void;
}

// Need this import for the InferGraphQLClient reference
import type { InferGraphQLClient } from './client-types';
