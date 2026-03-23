/**
 * @fileoverview GraphQL schema definition types for grouping fields.
 *
 * Mirrors the HTTP router definition pattern with hierarchical grouping,
 * dotted-key access, and deep merge support.
 *
 * @module graphql/field/types/schema-definition
 */

import type { GraphQLFieldDefinition, GraphQLOperationType } from './field-definition.type';
import type { SchemaAdapter } from '../../../http/schema/types';

// ============================================================================
// Schema Types
// ============================================================================

/**
 * A schema entry can be a field definition, a nested config, or a schema definition.
 */
export type GraphQLSchemaEntry =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | GraphQLFieldDefinition<GraphQLOperationType, any, any, any>
  | GraphQLSchemaConfig
  | GraphQLSchemaDefinition;

/**
 * Configuration for a GraphQL schema (group of fields).
 */
export interface GraphQLSchemaConfig {
  readonly [key: string]: GraphQLSchemaEntry;
}

/**
 * Schema-level defaults applied to all child fields.
 */
export interface GraphQLSchemaDefaults {
  /** Default tags for all fields. Merged with field-specific tags. */
  readonly tags?: readonly string[];

  /** Default context schema. Applied to fields that don't define their own. */
  readonly context?: SchemaAdapter;
}

/**
 * A fully defined GraphQL schema.
 */
export interface GraphQLSchemaDefinition<T extends GraphQLSchemaConfig = GraphQLSchemaConfig> {
  /** The fields and nested groups in this schema. */
  readonly fields: T;

  /** Default values applied to all child fields. */
  readonly defaults?: GraphQLSchemaDefaults;

  /**
   * Marker to identify this as a GraphQL schema definition.
   * @internal
   */
  readonly _isGraphQLSchema: true;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Checks if a value is a GraphQLFieldDefinition.
 */
export function isFieldDefinition(value: unknown): value is GraphQLFieldDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_isGraphQLField' in value &&
    (value as GraphQLFieldDefinition)._isGraphQLField === true
  );
}

/**
 * Checks if a value is a GraphQLSchemaDefinition.
 */
export function isSchemaDefinition(value: unknown): value is GraphQLSchemaDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_isGraphQLSchema' in value &&
    (value as GraphQLSchemaDefinition)._isGraphQLSchema === true
  );
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Flattens a schema into a map of dotted keys to field definitions.
 */
export type FlattenSchema<
  T extends GraphQLSchemaConfig,
  Prefix extends string = '',
> = T extends GraphQLSchemaConfig
  ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [K in keyof T]: T[K] extends GraphQLFieldDefinition<any, any, any, any>
        ? { [P in `${Prefix}${K & string}`]: T[K] }
        : T[K] extends GraphQLSchemaConfig
          ? FlattenSchema<T[K], `${Prefix}${K & string}.`>
          : never;
    }[keyof T] extends infer U
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      U extends Record<string, GraphQLFieldDefinition<any, any, any, any>>
      ? U
      : never
    : never
  : never;

/**
 * Gets all field keys from a schema.
 */
export type SchemaKeys<
  T extends GraphQLSchemaConfig,
  Prefix extends string = '',
> = T extends GraphQLSchemaConfig
  ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [K in keyof T]: T[K] extends GraphQLFieldDefinition<any, any, any, any>
        ? `${Prefix}${K & string}`
        : T[K] extends GraphQLSchemaConfig
          ? SchemaKeys<T[K], `${Prefix}${K & string}.`>
          : never;
    }[keyof T]
  : never;

/**
 * Gets a field by its dotted key path.
 */
export type GetField<
  T extends GraphQLSchemaConfig,
  K extends string,
> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? T[Head] extends GraphQLSchemaConfig
      ? GetField<T[Head], Tail>
      : never
    : never
  : K extends keyof T
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T[K] extends GraphQLFieldDefinition<any, any, any, any>
      ? T[K]
      : never
    : never;

// ============================================================================
// Deep Merge Types
// ============================================================================

/**
 * Deep-merges two schema configs at the type level.
 */
export type DeepMergeSchemas<A extends GraphQLSchemaConfig, B extends GraphQLSchemaConfig> = {
  readonly [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] extends GraphQLSchemaConfig
        ? B[K] extends GraphQLSchemaConfig
          ? DeepMergeSchemas<A[K], B[K]>
          : B[K]
        : B[K]
      : A[K]
    : K extends keyof B
      ? B[K]
      : never;
};

/**
 * Recursively deep-merges N schema configs left-to-right.
 */
export type DeepMergeSchemasAll<T extends readonly GraphQLSchemaConfig[]> = T extends readonly [
  infer Only extends GraphQLSchemaConfig,
]
  ? Only
  : T extends readonly [
        infer First extends GraphQLSchemaConfig,
        infer Second extends GraphQLSchemaConfig,
        ...infer Rest extends readonly GraphQLSchemaConfig[],
      ]
    ? DeepMergeSchemasAll<[DeepMergeSchemas<First, Second>, ...Rest]>
    : GraphQLSchemaConfig;

// ============================================================================
// Runtime Utilities
// ============================================================================

/**
 * Collects all fields from a schema into a flat array.
 */
export function collectFields(
  config: GraphQLSchemaConfig,
  basePath = '',
): { key: string; field: GraphQLFieldDefinition }[] {
  const fields: { key: string; field: GraphQLFieldDefinition }[] = [];

  for (const [key, value] of Object.entries(config)) {
    const fullKey = basePath ? `${basePath}.${key}` : key;

    if (isFieldDefinition(value)) {
      fields.push({ key: fullKey, field: value });
    } else if (isSchemaDefinition(value)) {
      fields.push(...collectFields(value.fields, fullKey));
    } else if (typeof value === 'object' && value !== null) {
      fields.push(...collectFields(value as GraphQLSchemaConfig, fullKey));
    }
  }

  return fields;
}
