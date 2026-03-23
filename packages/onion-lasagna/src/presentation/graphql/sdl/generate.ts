/**
 * @fileoverview GraphQL SDL generation from schema definitions.
 *
 * The `generateGraphQLSDL` function creates a complete GraphQL Schema
 * Definition Language string from a schema definition.
 *
 * Input/output schemas are converted to JSON Schema via `toJsonSchema()`,
 * then mapped to GraphQL type definitions.
 *
 * @module graphql/sdl/generate
 */

import type { SchemaAdapter, JsonSchema } from '../../http/schema/types';
import type {
  GraphQLSchemaConfig,
  GraphQLSchemaDefinition,
  GraphQLFieldDefinition,
} from '../field/types';
import { isSchemaDefinition, collectFields } from '../field/types';
import { generateFieldId } from '../field/utils';
import type { GraphQLSDLConfig } from './types';

// ============================================================================
// Public API
// ============================================================================

/**
 * Generates a GraphQL SDL string from a schema definition.
 *
 * Walks the schema structure, extracts JSON schemas from all field
 * definitions, and builds a complete SDL with Query, Mutation, and
 * type definitions.
 *
 * @param schema - Schema definition or schema config
 * @param config - Optional SDL generation configuration
 * @returns Complete GraphQL SDL string
 *
 * @example Basic usage
 * ```typescript
 * import { generateGraphQLSDL } from '@cosmneo/onion-lasagna/graphql/sdl';
 *
 * const sdl = generateGraphQLSDL(projectSchema, {
 *   preamble: 'scalar DateTime',
 * });
 *
 * console.log(sdl);
 * // type Query {
 * //   projectsGet(input: ProjectsGetInput!): ProjectsGetOutput
 * //   projectsList: ProjectsListOutput
 * // }
 * // ...
 * ```
 */
export function generateGraphQLSDL<T extends GraphQLSchemaConfig>(
  schema: T | GraphQLSchemaDefinition<T>,
  config?: GraphQLSDLConfig,
): string {
  const fields = isSchemaDefinition(schema) ? schema.fields : schema;
  const collectedFields = collectFields(fields);

  const includeDescriptions = config?.includeDescriptions ?? true;
  const includeDeprecations = config?.includeDeprecations ?? true;

  // Partition fields by operation type
  const queries: { fieldId: string; field: GraphQLFieldDefinition }[] = [];
  const mutations: { fieldId: string; field: GraphQLFieldDefinition }[] = [];
  const subscriptions: { fieldId: string; field: GraphQLFieldDefinition }[] = [];

  for (const { key, field } of collectedFields) {
    const fieldId = generateFieldId(key);
    if (field.operation === 'query') {
      queries.push({ fieldId, field });
    } else if (field.operation === 'mutation') {
      mutations.push({ fieldId, field });
    } else if (field.operation === 'subscription') {
      subscriptions.push({ fieldId, field });
    }
  }

  // Collect all named types that need to be emitted
  const namedTypes: Map<string, string> = new Map();
  const lines: string[] = [];

  // Preamble
  if (config?.preamble) {
    lines.push(config.preamble);
    lines.push('');
  }

  // Build Query type
  if (queries.length > 0) {
    lines.push('type Query {');
    for (const { fieldId, field } of queries) {
      const fieldLine = buildFieldLine(
        fieldId,
        field,
        namedTypes,
        includeDescriptions,
        includeDeprecations,
      );
      lines.push(fieldLine);
    }
    lines.push('}');
    lines.push('');
  }

  // Build Mutation type
  if (mutations.length > 0) {
    lines.push('type Mutation {');
    for (const { fieldId, field } of mutations) {
      const fieldLine = buildFieldLine(
        fieldId,
        field,
        namedTypes,
        includeDescriptions,
        includeDeprecations,
      );
      lines.push(fieldLine);
    }
    lines.push('}');
    lines.push('');
  }

  // Build Subscription type
  if (subscriptions.length > 0) {
    lines.push('type Subscription {');
    for (const { fieldId, field } of subscriptions) {
      const fieldLine = buildFieldLine(
        fieldId,
        field,
        namedTypes,
        includeDescriptions,
        includeDeprecations,
      );
      lines.push(fieldLine);
    }
    lines.push('}');
    lines.push('');
  }

  // Emit named types (inputs and outputs)
  for (const [, typeBody] of namedTypes) {
    lines.push(typeBody);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Builds a single field line for a root type (Query/Mutation/Subscription).
 */
function buildFieldLine(
  fieldId: string,
  field: GraphQLFieldDefinition,
  namedTypes: Map<string, string>,
  includeDescriptions: boolean,
  includeDeprecations: boolean,
): string {
  const parts: string[] = [];

  // Description as SDL doc string (escaped to prevent triple-quote injection)
  if (includeDescriptions && field.docs.description) {
    const escaped = field.docs.description.replace(/"""/g, '\\"""');
    parts.push(`  """${escaped}"""`);
  }

  // Build args and return type
  const inputTypeName = field.input ? `${capitalize(fieldId)}Input` : undefined;
  const outputTypeName = field.output ? `${capitalize(fieldId)}Output` : undefined;

  // Register named input type
  if (field.input && inputTypeName) {
    const jsonSchema = (field.input as SchemaAdapter).toJsonSchema();
    namedTypes.set(inputTypeName, buildInputType(inputTypeName, jsonSchema));
  }

  // Register named output type
  if (field.output && outputTypeName) {
    const jsonSchema = (field.output as SchemaAdapter).toJsonSchema();
    namedTypes.set(outputTypeName, buildOutputType(outputTypeName, jsonSchema));
  }

  // Build field signature
  let signature = `  ${fieldId}`;

  if (inputTypeName) {
    signature += `(input: ${inputTypeName}!)`;
  }

  signature += ': ';
  signature += outputTypeName ?? 'JSON';

  // Deprecation directive
  if (includeDeprecations && field.docs.deprecated) {
    const reason = field.docs.deprecationReason;
    signature += reason ? ` @deprecated(reason: "${escapeSDLString(reason)}")` : ' @deprecated';
  }

  if (parts.length > 0) {
    return parts.join('\n') + '\n' + signature;
  }
  return signature;
}

/**
 * Builds a GraphQL input type from a JSON schema.
 */
function buildInputType(typeName: string, jsonSchema: JsonSchema): string {
  const lines: string[] = [`input ${typeName} {`];

  if (jsonSchema.properties && typeof jsonSchema.properties === 'object') {
    const required = new Set(
      Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : [],
    );

    for (const [propName, propSchema] of Object.entries(
      jsonSchema.properties as Record<string, JsonSchema>,
    )) {
      const graphqlType = jsonSchemaToGraphQLType(propSchema);
      const isRequired = required.has(propName);
      lines.push(`  ${propName}: ${graphqlType}${isRequired ? '!' : ''}`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Builds a GraphQL output type from a JSON schema.
 */
function buildOutputType(typeName: string, jsonSchema: JsonSchema): string {
  const lines: string[] = [`type ${typeName} {`];

  if (jsonSchema.properties && typeof jsonSchema.properties === 'object') {
    const required = new Set(
      Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : [],
    );

    for (const [propName, propSchema] of Object.entries(
      jsonSchema.properties as Record<string, JsonSchema>,
    )) {
      const graphqlType = jsonSchemaToGraphQLType(propSchema);
      const isRequired = required.has(propName);
      lines.push(`  ${propName}: ${graphqlType}${isRequired ? '!' : ''}`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Converts a JSON schema to a GraphQL type string.
 */
function jsonSchemaToGraphQLType(schema: JsonSchema): string {
  if (!schema || typeof schema !== 'object') return 'JSON';

  // Handle enum
  if (schema.enum && Array.isArray(schema.enum)) {
    return 'String';
  }

  // Handle type
  const type = schema.type as string | undefined;

  switch (type) {
    case 'string':
      return 'String';
    case 'integer':
      return 'Int';
    case 'number':
      return 'Float';
    case 'boolean':
      return 'Boolean';
    case 'array': {
      const items = schema.items as JsonSchema | undefined;
      if (items) {
        return `[${jsonSchemaToGraphQLType(items)}]`;
      }
      return '[JSON]';
    }
    case 'object':
      return 'JSON';
    default:
      // Handle oneOf, anyOf, allOf — fallback to JSON
      if (schema.oneOf || schema.anyOf || schema.allOf) {
        return 'JSON';
      }
      // Object without explicit type but has properties
      if (schema.properties) {
        return 'JSON';
      }
      return 'JSON';
  }
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escapes a string for use in SDL quoted string literals.
 * Handles backslashes, quotes, newlines, and triple-quote injection.
 */
function escapeSDLString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
