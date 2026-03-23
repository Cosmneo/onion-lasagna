/**
 * @fileoverview Factory function for creating GraphQL schema definitions.
 *
 * The `defineGraphQLSchema` function groups fields into a hierarchical structure
 * with optional schema-level defaults for context and tags.
 *
 * @module graphql/field/define-schema
 */

import type {
  GraphQLSchemaConfig,
  GraphQLSchemaDefaults,
  GraphQLSchemaDefinition,
  GraphQLFieldDefinition,
  DeepMergeSchemas,
  DeepMergeSchemasAll,
} from './types';
import { isFieldDefinition, isSchemaDefinition } from './types';

/**
 * Options for schema definition.
 */
export interface DefineGraphQLSchemaOptions {
  /**
   * Default values applied to all child fields.
   *
   * @example
   * ```typescript
   * defineGraphQLSchema({
   *   getUser: getUserQuery,
   *   createUser: createUserMutation,
   * }, {
   *   defaults: {
   *     context: zodSchema(executionContextSchema),
   *     tags: ['Users'],
   *   },
   * })
   * ```
   */
  readonly defaults?: GraphQLSchemaDefaults;
}

/**
 * Creates a GraphQL schema definition from a configuration object.
 *
 * A schema is a hierarchical grouping of fields that provides:
 * - Organized API structure with nested namespaces
 * - Type-safe resolver registration
 * - Schema-level defaults for context and tags
 *
 * @param fields - Object containing fields and nested groups
 * @param options - Optional schema configuration
 * @returns A frozen GraphQLSchemaDefinition object
 *
 * @example Basic schema
 * ```typescript
 * const schema = defineGraphQLSchema({
 *   users: {
 *     get: getUserQuery,
 *     list: listUsersQuery,
 *     create: createUserMutation,
 *   },
 * });
 * ```
 *
 * @example With defaults
 * ```typescript
 * const schema = defineGraphQLSchema({
 *   get: getUserQuery,
 *   list: listUsersQuery,
 * }, {
 *   defaults: {
 *     context: zodSchema(executionContextSchema),
 *     tags: ['Users'],
 *   },
 * });
 * ```
 */
export function defineGraphQLSchema<T extends GraphQLSchemaConfig>(
  fields: T,
  options?: DefineGraphQLSchemaOptions,
): GraphQLSchemaDefinition<T> {
  const defaults = options?.defaults;

  // Apply defaults to fields if context or tags are provided
  const processedFields =
    defaults?.context || defaults?.tags ? (applySchemaDefaults(fields, defaults) as T) : fields;

  const definition: GraphQLSchemaDefinition<T> = {
    fields: processedFields,
    defaults,
    _isGraphQLSchema: true,
  };

  return deepFreeze(definition);
}

/**
 * Recursively applies schema-level defaults to all fields in the tree.
 */
function applySchemaDefaults(
  config: GraphQLSchemaConfig,
  defaults: GraphQLSchemaDefaults,
): GraphQLSchemaConfig {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (isFieldDefinition(value)) {
      result[key] = applyDefaultsToField(value, defaults);
    } else if (isSchemaDefinition(value)) {
      result[key] = {
        ...value,
        fields: applySchemaDefaults(value.fields, defaults),
      };
    } else if (typeof value === 'object' && value !== null) {
      result[key] = applySchemaDefaults(value as GraphQLSchemaConfig, defaults);
    }
  }

  return result as GraphQLSchemaConfig;
}

/**
 * Applies schema-level defaults to a single field definition.
 */
function applyDefaultsToField(
  field: GraphQLFieldDefinition,
  defaults: GraphQLSchemaDefaults,
): GraphQLFieldDefinition {
  const needsContext = defaults.context && !field.context;
  const needsTags = defaults.tags && defaults.tags.length > 0;

  if (!needsContext && !needsTags) return field;

  return Object.freeze({
    ...field,
    context: field.context ?? defaults.context ?? undefined,
    docs: {
      ...field.docs,
      tags: mergeTags(defaults.tags, field.docs.tags),
    },
  }) as GraphQLFieldDefinition;
}

/**
 * Merges schema-level tags with field-level tags, avoiding duplicates.
 */
function mergeTags(
  schemaTags?: readonly string[],
  fieldTags?: readonly string[],
): readonly string[] | undefined {
  if (!schemaTags || schemaTags.length === 0) return fieldTags;
  if (!fieldTags || fieldTags.length === 0) return schemaTags;

  const merged = [...schemaTags];
  for (const tag of fieldTags) {
    if (!merged.includes(tag)) {
      merged.push(tag);
    }
  }
  return merged;
}

/**
 * Deep freezes an object and all its nested objects.
 */
function deepFreeze<T extends object>(obj: T): T {
  const propNames = Object.getOwnPropertyNames(obj) as (keyof T)[];

  for (const name of propNames) {
    const value = obj[name];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return Object.freeze(obj);
}

// ============================================================================
// mergeGraphQLSchemas — variadic deep merge
// ============================================================================

type SchemaInput<T extends GraphQLSchemaConfig> = T | GraphQLSchemaDefinition<T>;

/** Extracts the raw GraphQLSchemaConfig from either a plain config or a GraphQLSchemaDefinition. */
function extractFields<T extends GraphQLSchemaConfig>(input: SchemaInput<T>): T {
  return isSchemaDefinition(input) ? input.fields : input;
}

/** Returns true if `value` is a plain sub-group object (not a FieldDefinition, not a SchemaDefinition). */
function isSubGroup(value: unknown): value is GraphQLSchemaConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isFieldDefinition(value) &&
    !isSchemaDefinition(value)
  );
}

/** Recursively deep-merges two schema configs. Sub-groups are merged; leaves are overwritten. */
function deepMergeConfigs(a: GraphQLSchemaConfig, b: GraphQLSchemaConfig): GraphQLSchemaConfig {
  const result: Record<string, unknown> = { ...a };

  for (const key of Object.keys(b)) {
    const aVal = result[key];
    const bVal = b[key];

    if (isSubGroup(aVal) && isSubGroup(bVal)) {
      result[key] = deepMergeConfigs(aVal, bVal);
    } else {
      result[key] = bVal;
    }
  }

  return result as GraphQLSchemaConfig;
}

// Overloads for 2–8 schemas (clean IDE experience)
export function mergeGraphQLSchemas<T1 extends GraphQLSchemaConfig, T2 extends GraphQLSchemaConfig>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
): GraphQLSchemaDefinition<DeepMergeSchemas<T1, T2>>;
export function mergeGraphQLSchemas<
  T1 extends GraphQLSchemaConfig,
  T2 extends GraphQLSchemaConfig,
  T3 extends GraphQLSchemaConfig,
>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
  s3: SchemaInput<T3>,
): GraphQLSchemaDefinition<DeepMergeSchemasAll<[T1, T2, T3]>>;
export function mergeGraphQLSchemas<
  T1 extends GraphQLSchemaConfig,
  T2 extends GraphQLSchemaConfig,
  T3 extends GraphQLSchemaConfig,
  T4 extends GraphQLSchemaConfig,
>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
  s3: SchemaInput<T3>,
  s4: SchemaInput<T4>,
): GraphQLSchemaDefinition<DeepMergeSchemasAll<[T1, T2, T3, T4]>>;
export function mergeGraphQLSchemas<
  T1 extends GraphQLSchemaConfig,
  T2 extends GraphQLSchemaConfig,
  T3 extends GraphQLSchemaConfig,
  T4 extends GraphQLSchemaConfig,
  T5 extends GraphQLSchemaConfig,
>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
  s3: SchemaInput<T3>,
  s4: SchemaInput<T4>,
  s5: SchemaInput<T5>,
): GraphQLSchemaDefinition<DeepMergeSchemasAll<[T1, T2, T3, T4, T5]>>;
export function mergeGraphQLSchemas<
  T1 extends GraphQLSchemaConfig,
  T2 extends GraphQLSchemaConfig,
  T3 extends GraphQLSchemaConfig,
  T4 extends GraphQLSchemaConfig,
  T5 extends GraphQLSchemaConfig,
  T6 extends GraphQLSchemaConfig,
>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
  s3: SchemaInput<T3>,
  s4: SchemaInput<T4>,
  s5: SchemaInput<T5>,
  s6: SchemaInput<T6>,
): GraphQLSchemaDefinition<DeepMergeSchemasAll<[T1, T2, T3, T4, T5, T6]>>;
export function mergeGraphQLSchemas<
  T1 extends GraphQLSchemaConfig,
  T2 extends GraphQLSchemaConfig,
  T3 extends GraphQLSchemaConfig,
  T4 extends GraphQLSchemaConfig,
  T5 extends GraphQLSchemaConfig,
  T6 extends GraphQLSchemaConfig,
  T7 extends GraphQLSchemaConfig,
>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
  s3: SchemaInput<T3>,
  s4: SchemaInput<T4>,
  s5: SchemaInput<T5>,
  s6: SchemaInput<T6>,
  s7: SchemaInput<T7>,
): GraphQLSchemaDefinition<DeepMergeSchemasAll<[T1, T2, T3, T4, T5, T6, T7]>>;
export function mergeGraphQLSchemas<
  T1 extends GraphQLSchemaConfig,
  T2 extends GraphQLSchemaConfig,
  T3 extends GraphQLSchemaConfig,
  T4 extends GraphQLSchemaConfig,
  T5 extends GraphQLSchemaConfig,
  T6 extends GraphQLSchemaConfig,
  T7 extends GraphQLSchemaConfig,
  T8 extends GraphQLSchemaConfig,
>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
  s3: SchemaInput<T3>,
  s4: SchemaInput<T4>,
  s5: SchemaInput<T5>,
  s6: SchemaInput<T6>,
  s7: SchemaInput<T7>,
  s8: SchemaInput<T8>,
): GraphQLSchemaDefinition<DeepMergeSchemasAll<[T1, T2, T3, T4, T5, T6, T7, T8]>>;
// Add overloads for 9-12 following the same pattern as define-router.ts
export function mergeGraphQLSchemas<
  T1 extends GraphQLSchemaConfig,
  T2 extends GraphQLSchemaConfig,
  T3 extends GraphQLSchemaConfig,
  T4 extends GraphQLSchemaConfig,
  T5 extends GraphQLSchemaConfig,
  T6 extends GraphQLSchemaConfig,
  T7 extends GraphQLSchemaConfig,
  T8 extends GraphQLSchemaConfig,
  T9 extends GraphQLSchemaConfig,
>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
  s3: SchemaInput<T3>,
  s4: SchemaInput<T4>,
  s5: SchemaInput<T5>,
  s6: SchemaInput<T6>,
  s7: SchemaInput<T7>,
  s8: SchemaInput<T8>,
  s9: SchemaInput<T9>,
): GraphQLSchemaDefinition<
  DeepMergeSchemas<
    DeepMergeSchemas<
      DeepMergeSchemas<
        DeepMergeSchemas<
          DeepMergeSchemas<
            DeepMergeSchemas<DeepMergeSchemas<DeepMergeSchemas<T1, T2>, T3>, T4>,
            T5
          >,
          T6
        >,
        T7
      >,
      T8
    >,
    T9
  >
>;
export function mergeGraphQLSchemas<
  T1 extends GraphQLSchemaConfig,
  T2 extends GraphQLSchemaConfig,
  T3 extends GraphQLSchemaConfig,
  T4 extends GraphQLSchemaConfig,
  T5 extends GraphQLSchemaConfig,
  T6 extends GraphQLSchemaConfig,
  T7 extends GraphQLSchemaConfig,
  T8 extends GraphQLSchemaConfig,
  T9 extends GraphQLSchemaConfig,
  T10 extends GraphQLSchemaConfig,
>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
  s3: SchemaInput<T3>,
  s4: SchemaInput<T4>,
  s5: SchemaInput<T5>,
  s6: SchemaInput<T6>,
  s7: SchemaInput<T7>,
  s8: SchemaInput<T8>,
  s9: SchemaInput<T9>,
  s10: SchemaInput<T10>,
): GraphQLSchemaDefinition<
  DeepMergeSchemas<
    DeepMergeSchemas<
      DeepMergeSchemas<
        DeepMergeSchemas<
          DeepMergeSchemas<
            DeepMergeSchemas<
              DeepMergeSchemas<DeepMergeSchemas<DeepMergeSchemas<T1, T2>, T3>, T4>,
              T5
            >,
            T6
          >,
          T7
        >,
        T8
      >,
      T9
    >,
    T10
  >
>;
export function mergeGraphQLSchemas<
  T1 extends GraphQLSchemaConfig,
  T2 extends GraphQLSchemaConfig,
  T3 extends GraphQLSchemaConfig,
  T4 extends GraphQLSchemaConfig,
  T5 extends GraphQLSchemaConfig,
  T6 extends GraphQLSchemaConfig,
  T7 extends GraphQLSchemaConfig,
  T8 extends GraphQLSchemaConfig,
  T9 extends GraphQLSchemaConfig,
  T10 extends GraphQLSchemaConfig,
  T11 extends GraphQLSchemaConfig,
>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
  s3: SchemaInput<T3>,
  s4: SchemaInput<T4>,
  s5: SchemaInput<T5>,
  s6: SchemaInput<T6>,
  s7: SchemaInput<T7>,
  s8: SchemaInput<T8>,
  s9: SchemaInput<T9>,
  s10: SchemaInput<T10>,
  s11: SchemaInput<T11>,
): GraphQLSchemaDefinition<
  DeepMergeSchemas<
    DeepMergeSchemas<
      DeepMergeSchemas<
        DeepMergeSchemas<
          DeepMergeSchemas<
            DeepMergeSchemas<
              DeepMergeSchemas<
                DeepMergeSchemas<DeepMergeSchemas<DeepMergeSchemas<T1, T2>, T3>, T4>,
                T5
              >,
              T6
            >,
            T7
          >,
          T8
        >,
        T9
      >,
      T10
    >,
    T11
  >
>;
export function mergeGraphQLSchemas<
  T1 extends GraphQLSchemaConfig,
  T2 extends GraphQLSchemaConfig,
  T3 extends GraphQLSchemaConfig,
  T4 extends GraphQLSchemaConfig,
  T5 extends GraphQLSchemaConfig,
  T6 extends GraphQLSchemaConfig,
  T7 extends GraphQLSchemaConfig,
  T8 extends GraphQLSchemaConfig,
  T9 extends GraphQLSchemaConfig,
  T10 extends GraphQLSchemaConfig,
  T11 extends GraphQLSchemaConfig,
  T12 extends GraphQLSchemaConfig,
>(
  s1: SchemaInput<T1>,
  s2: SchemaInput<T2>,
  s3: SchemaInput<T3>,
  s4: SchemaInput<T4>,
  s5: SchemaInput<T5>,
  s6: SchemaInput<T6>,
  s7: SchemaInput<T7>,
  s8: SchemaInput<T8>,
  s9: SchemaInput<T9>,
  s10: SchemaInput<T10>,
  s11: SchemaInput<T11>,
  s12: SchemaInput<T12>,
): GraphQLSchemaDefinition<
  DeepMergeSchemas<
    DeepMergeSchemas<
      DeepMergeSchemas<
        DeepMergeSchemas<
          DeepMergeSchemas<
            DeepMergeSchemas<
              DeepMergeSchemas<
                DeepMergeSchemas<
                  DeepMergeSchemas<DeepMergeSchemas<DeepMergeSchemas<T1, T2>, T3>, T4>,
                  T5
                >,
                T6
              >,
              T7
            >,
            T8
          >,
          T9
        >,
        T10
      >,
      T11
    >,
    T12
  >
>;

// Variadic fallback for 13+
export function mergeGraphQLSchemas(
  ...schemas: SchemaInput<GraphQLSchemaConfig>[]
): GraphQLSchemaDefinition<GraphQLSchemaConfig>;

// Implementation
export function mergeGraphQLSchemas(
  ...schemas: SchemaInput<GraphQLSchemaConfig>[]
): GraphQLSchemaDefinition<GraphQLSchemaConfig> {
  const merged = schemas.map(extractFields).reduce(deepMergeConfigs);
  return defineGraphQLSchema(merged);
}
