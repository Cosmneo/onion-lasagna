/**
 * @fileoverview Pure query key builder for GraphQL schemas.
 *
 * Generates hierarchical, type-safe query key functions from a
 * GraphQL schema definition. Keys follow the schema structure:
 *
 * - `queryKeys.todos()` → `['todos']`
 * - `queryKeys.todos.list()` → `['todos', 'list']`
 * - `queryKeys.todos.list({ completed: true })` → `['todos', 'list', { completed: true }]`
 *
 * Namespace keys are both callable (for invalidating entire groups)
 * and have properties (for specific field keys).
 *
 * @module graphql/react-query/query-keys
 */

import type {
  GraphQLSchemaConfig,
  GraphQLSchemaDefinition,
} from '@cosmneo/onion-lasagna/graphql/field';
import { isFieldDefinition, isSchemaDefinition } from '@cosmneo/onion-lasagna/graphql/field';

/**
 * Builds query key functions from a GraphQL schema definition.
 *
 * @param schema - Schema definition or config
 * @param parentPath - Base path (used for queryKeyPrefix)
 * @returns Record of query key functions
 *
 * @example
 * ```typescript
 * const keys = buildGraphQLQueryKeys(todoSchema);
 *
 * keys.todos()        // ['todos']
 * keys.todos.list()   // ['todos', 'list']
 * keys.todos.list({ completed: true })  // ['todos', 'list', { completed: true }]
 * ```
 */
export function buildGraphQLQueryKeys<T extends GraphQLSchemaConfig>(
  schema: T | GraphQLSchemaDefinition<T>,
  parentPath: readonly string[] = [],
): Record<string, unknown> {
  const config = isSchemaDefinition(schema) ? schema.fields : schema;
  return buildQueryKeysFromConfig(config, parentPath);
}

/**
 * Recursively builds query key functions from a schema config.
 */
function buildQueryKeysFromConfig(
  config: GraphQLSchemaConfig,
  parentPath: readonly string[],
): Record<string, unknown> {
  const keys: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    const currentPath = [...parentPath, key];

    if (isFieldDefinition(value)) {
      keys[key] = createFieldKeyFn(currentPath);
    } else if (isSchemaDefinition(value)) {
      keys[key] = createNamespaceKeyFn(currentPath, value.fields);
    } else if (typeof value === 'object' && value !== null) {
      keys[key] = createNamespaceKeyFn(currentPath, value as GraphQLSchemaConfig);
    }
  }

  return keys;
}

/**
 * Creates a query key function for a single field.
 * Returns the path, optionally appending input.
 */
function createFieldKeyFn(path: readonly string[]): (input?: unknown) => readonly unknown[] {
  return (input?: unknown) => {
    if (isEmptyInput(input)) return path;
    return [...path, input];
  };
}

/**
 * Creates a namespace key function that is both callable and has child properties.
 *
 * - `keys.todos()` → `['todos']` (invalidate all todo queries)
 * - `keys.todos.list()` → `['todos', 'list']` (specific field key)
 */
function createNamespaceKeyFn(
  path: readonly string[],
  childConfig: GraphQLSchemaConfig,
): (() => readonly string[]) & Record<string, unknown> {
  const fn = () => path;
  const children = buildQueryKeysFromConfig(childConfig, path);
  return Object.assign(fn, children);
}

/**
 * Checks if an input value is empty.
 */
function isEmptyInput(input: unknown): boolean {
  if (input === undefined || input === null) return true;
  if (typeof input !== 'object') return false;
  return Object.keys(input as Record<string, unknown>).length === 0;
}
