/**
 * @fileoverview Factory for creating in-memory mock GraphQL clients.
 *
 * `createMockGraphQLClient` builds a client with the same shape as
 * `createGraphQLClient`, backed by user-provided handler functions
 * instead of HTTP calls.
 *
 * @module graphql/client/create-mock-graphql-client
 */

import type { GraphQLSchemaConfig, GraphQLSchemaDefinition } from '@cosmneo/onion-lasagna/graphql/field';
import { isFieldDefinition, isSchemaDefinition } from '@cosmneo/onion-lasagna/graphql/field';
import type {
  MockGraphQLHandlers,
  MockGraphQLCall,
  MockGraphQLClientResult,
} from './types';
import type { InferGraphQLClient } from './client-types';

/**
 * Creates an in-memory mock GraphQL client from a schema definition and handler map.
 *
 * @param schema - Schema definition or schema config
 * @param handlers - Partial map of mock handlers matching the schema structure
 * @returns `{ client, calls, callsFor, reset }`
 *
 * @example
 * ```typescript
 * import { createMockGraphQLClient } from '@cosmneo/onion-lasagna-graphql-client';
 *
 * const { client, calls, callsFor, reset } = createMockGraphQLClient(schema, {
 *   users: {
 *     get: (input) => ({ id: input.userId, name: 'Alice' }),
 *     list: () => [{ id: '1', name: 'Alice' }],
 *   },
 * });
 *
 * const user = await client.users.get({ userId: '123' });
 * expect(callsFor('users.get')).toHaveLength(1);
 * reset();
 * ```
 */
export function createMockGraphQLClient<T extends GraphQLSchemaConfig>(
  schema: T | GraphQLSchemaDefinition<T>,
  handlers: MockGraphQLHandlers<T>,
): MockGraphQLClientResult<T> {
  const fields = isSchemaDefinition(schema) ? schema.fields : schema;
  const calls: MockGraphQLCall[] = [];

  const client = buildMockProxy(
    fields,
    handlers as Record<string, unknown>,
    calls,
    [],
  ) as InferGraphQLClient<T>;

  return {
    client,
    calls,
    callsFor: (field: string) => calls.filter((c) => c.field === field),
    reset: () => {
      calls.length = 0;
    },
  };
}

/**
 * Recursively builds a mock client proxy from schema config and handlers.
 */
function buildMockProxy(
  config: GraphQLSchemaConfig,
  handlers: Record<string, unknown>,
  calls: MockGraphQLCall[],
  keyPath: readonly string[],
): Record<string, unknown> {
  const proxy: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    const currentKeyPath = [...keyPath, key];
    const handler = handlers[key];

    if (isFieldDefinition(value)) {
      proxy[key] = createMockMethod(currentKeyPath.join('.'), handler, calls);
    } else if (isSchemaDefinition(value)) {
      proxy[key] = buildMockProxy(
        value.fields,
        (handler ?? {}) as Record<string, unknown>,
        calls,
        currentKeyPath,
      );
    } else if (typeof value === 'object' && value !== null) {
      proxy[key] = buildMockProxy(
        value as GraphQLSchemaConfig,
        (handler ?? {}) as Record<string, unknown>,
        calls,
        currentKeyPath,
      );
    }
  }

  return proxy;
}

/**
 * Creates a mock method for a single field.
 * Throws if no handler is registered; records successful calls.
 */
function createMockMethod(
  fieldKey: string,
  handler: unknown,
  calls: MockGraphQLCall[],
): (input?: unknown) => Promise<unknown> {
  return async (input?: unknown) => {
    if (typeof handler !== 'function') {
      throw new Error(`MockGraphQLClient: no handler for field "${fieldKey}"`);
    }

    const response = await handler(input);

    calls.push({
      field: fieldKey,
      input,
      response,
      timestamp: Date.now(),
    });

    return response;
  };
}

/**
 * Creates a sequenced mock handler that returns different responses on each call.
 *
 * @param responses - Array of handler functions called in order
 * @param options - Behavior when responses are exhausted (default: `'throw'`)
 * @returns A handler function suitable for use in `createMockGraphQLClient` handlers
 *
 * @example
 * ```typescript
 * const { client } = createMockGraphQLClient(schema, {
 *   users: {
 *     list: mockGraphQLSequence([
 *       () => [{ id: '1' }],
 *       () => [{ id: '1' }, { id: '2' }],
 *     ]),
 *   },
 * });
 *
 * await client.users.list(); // [{ id: '1' }]
 * await client.users.list(); // [{ id: '1' }, { id: '2' }]
 * ```
 */
export function mockGraphQLSequence<T>(
  responses: ReadonlyArray<(...args: unknown[]) => T | Promise<T>>,
  options?: { readonly exhausted?: 'throw' | 'cycle' | 'last' },
): (...args: unknown[]) => T | Promise<T> {
  const exhausted = options?.exhausted ?? 'throw';
  let index = 0;

  return (...args: unknown[]) => {
    if (index < responses.length) {
      const fn = responses[index]!;
      index++;
      return fn(...args);
    }

    switch (exhausted) {
      case 'cycle':
        index = 1;
        return responses[0]!(...args);
      case 'last':
        return responses[responses.length - 1]!(...args);
      case 'throw':
      default:
        throw new Error(
          `mockGraphQLSequence: all ${responses.length} responses exhausted`,
        );
    }
  };
}
