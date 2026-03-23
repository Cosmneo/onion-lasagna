/**
 * @fileoverview Builds a GraphQL executable schema from UnifiedGraphQLField[].
 *
 * Two modes:
 * - **Typed mode** (when schema definition is provided): Generates proper GraphQL
 *   types from SchemaAdapter's toJsonSchema(), enabling field selection.
 * - **JSON mode** (fallback): Uses JSON scalar for all fields — simpler but no
 *   field selection support.
 *
 * @module graphql/frameworks/yoga/build-schema
 */

import type { UnifiedGraphQLField } from '@cosmneo/onion-lasagna/graphql/server';
import type { SchemaAdapter, JsonSchema } from '@cosmneo/onion-lasagna/http/schema';
import type { GraphQLSchemaConfig, GraphQLSchemaDefinition } from '@cosmneo/onion-lasagna/graphql/field';
import { isSchemaDefinition, collectFields } from '@cosmneo/onion-lasagna/graphql/field';
import { generateFieldId } from '@cosmneo/onion-lasagna/graphql/field';
import { GraphQLScalarType, GraphQLError } from 'graphql';
import { mapErrorToGraphQLError } from '@cosmneo/onion-lasagna/graphql/shared';

/**
 * A JSON scalar that passes values through without transformation.
 */
const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => parseLiteralToJSON(ast),
});

const MAX_LITERAL_DEPTH = 128;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLiteralToJSON(ast: any, depth = 0): unknown {
  if (depth > MAX_LITERAL_DEPTH) {
    throw new Error('Input nesting depth exceeds maximum allowed');
  }
  switch (ast.kind) {
    case 'StringValue':
      return ast.value;
    case 'IntValue':
      return parseInt(ast.value, 10);
    case 'FloatValue': {
      const value = parseFloat(ast.value);
      if (!Number.isFinite(value)) return null;
      return value;
    }
    case 'BooleanValue':
      return ast.value;
    case 'NullValue':
      return null;
    case 'ListValue':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ast.values.map((v: any) => parseLiteralToJSON(v, depth + 1));
    case 'ObjectValue': {
      const obj: Record<string, unknown> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const field of ast.fields as any[]) {
        obj[field.name.value] = parseLiteralToJSON(field.value, depth + 1);
      }
      return obj;
    }
    default:
      return null;
  }
}

/**
 * Result of building a schema: type definitions + resolver map.
 */
export interface BuiltSchema {
  readonly typeDefs: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly resolvers: Record<string, any>;
}

/**
 * Builds SDL type definitions and resolver map from UnifiedGraphQLField[].
 *
 * When a schema definition is provided, generates typed SDL with proper
 * GraphQL types that support field selection. Otherwise falls back to JSON scalar.
 */
export function buildSchemaFromFields(
  fields: readonly UnifiedGraphQLField[],
  schema?: GraphQLSchemaConfig | GraphQLSchemaDefinition,
  onResolverError?: (error: unknown, fieldKey: string) => void,
): BuiltSchema {
  if (schema) {
    return buildTypedSchema(fields, schema, onResolverError);
  }
  return buildJsonSchema(fields, onResolverError);
}

// ============================================================================
// Typed Schema Builder
// ============================================================================

function buildTypedSchema(
  fields: readonly UnifiedGraphQLField[],
  schema: GraphQLSchemaConfig | GraphQLSchemaDefinition,
  onResolverError?: (error: unknown, fieldKey: string) => void,
): BuiltSchema {
  const config = isSchemaDefinition(schema) ? schema.fields : schema;
  const collectedFields = collectFields(config);

  // Build a map from fieldId → field definition (with schemas)
  const fieldDefMap = new Map<string, { input?: SchemaAdapter; output?: SchemaAdapter; operation: string }>();
  for (const { key, field } of collectedFields) {
    const fieldId = generateFieldId(key);
    fieldDefMap.set(fieldId, {
      input: field.input as SchemaAdapter | undefined,
      output: field.output as SchemaAdapter | undefined,
      operation: field.operation,
    });
  }

  // Track named types to emit
  const namedTypes = new Map<string, string>();
  const sdlLines: string[] = ['scalar JSON'];

  // Partition by operation
  const queries: UnifiedGraphQLField[] = [];
  const mutations: UnifiedGraphQLField[] = [];
  const subscriptions: UnifiedGraphQLField[] = [];

  for (const field of fields) {
    if (field.operation === 'query') queries.push(field);
    else if (field.operation === 'mutation') mutations.push(field);
    else if (field.operation === 'subscription') subscriptions.push(field);
  }

  // Query type
  sdlLines.push('');
  sdlLines.push('type Query {');
  if (queries.length > 0) {
    for (const field of queries) {
      const fieldId = field.metadata.fieldId ?? field.key;
      const def = fieldDefMap.get(fieldId);
      sdlLines.push(buildFieldSignature(fieldId, def, namedTypes));
    }
  } else {
    sdlLines.push('  _health: Boolean');
  }
  sdlLines.push('}');

  // Mutation type
  if (mutations.length > 0) {
    sdlLines.push('');
    sdlLines.push('type Mutation {');
    for (const field of mutations) {
      const fieldId = field.metadata.fieldId ?? field.key;
      const def = fieldDefMap.get(fieldId);
      sdlLines.push(buildFieldSignature(fieldId, def, namedTypes));
    }
    sdlLines.push('}');
  }

  // Subscription type
  if (subscriptions.length > 0) {
    sdlLines.push('');
    sdlLines.push('type Subscription {');
    for (const field of subscriptions) {
      const fieldId = field.metadata.fieldId ?? field.key;
      const def = fieldDefMap.get(fieldId);
      sdlLines.push(buildFieldSignature(fieldId, def, namedTypes));
    }
    sdlLines.push('}');
  }

  // Emit named types
  for (const [, typeBody] of namedTypes) {
    sdlLines.push('');
    sdlLines.push(typeBody);
  }

  // Build resolvers (same as JSON mode — resolvers return plain objects,
  // GraphQL handles field selection from the type system)
  return {
    typeDefs: sdlLines.join('\n'),
    resolvers: buildResolverMap(fields, queries, mutations, subscriptions, onResolverError),
  };
}

/**
 * Builds a single field signature like `  todosList: [Todo!]!` or `  todosCreate(input: TodosCreateInput!): Todo!`
 */
function buildFieldSignature(
  fieldId: string,
  def: { input?: SchemaAdapter; output?: SchemaAdapter } | undefined,
  namedTypes: Map<string, string>,
): string {
  // Output type
  let outputType = 'JSON';
  if (def?.output) {
    const jsonSchema = def.output.toJsonSchema();
    outputType = jsonSchemaToGraphQLType(jsonSchema, capitalize(fieldId), 'type', namedTypes);
  }

  // Input args
  if (def?.input) {
    const inputJsonSchema = def.input.toJsonSchema();
    const inputTypeName = `${capitalize(fieldId)}Input`;
    registerInputType(inputTypeName, inputJsonSchema, namedTypes);
    return `  ${fieldId}(input: ${inputTypeName}!): ${outputType}`;
  }

  return `  ${fieldId}: ${outputType}`;
}

/**
 * Converts a JSON schema to a GraphQL type reference, registering named types as needed.
 */
function jsonSchemaToGraphQLType(
  schema: JsonSchema,
  baseName: string,
  kind: 'type' | 'input',
  namedTypes: Map<string, string>,
): string {
  if (!schema || typeof schema !== 'object') return 'JSON';

  const type = schema.type as string | undefined;

  switch (type) {
    case 'string':
      return 'String!';
    case 'integer':
      return 'Int!';
    case 'number':
      return 'Float!';
    case 'boolean':
      return 'Boolean!';
    case 'array': {
      const items = schema.items as JsonSchema | undefined;
      if (items && typeof items === 'object') {
        const itemRec = items as Record<string, unknown>;
        const itemType = itemRec['type'];
        if (itemType === 'object' || itemRec['properties']) {
          // Array of objects — register a named type for the item
          const itemTypeName = baseName.endsWith('s') ? baseName.slice(0, -1) : `${baseName}Item`;
          registerNamedType(itemTypeName, items, kind, namedTypes);
          return `[${itemTypeName}!]!`;
        }
        // Array of primitives
        const innerType = scalarType(itemRec['type'] as string | undefined);
        return `[${innerType}]!`;
      }
      return '[JSON]!';
    }
    case 'object': {
      if (schema.properties) {
        registerNamedType(baseName, schema, kind, namedTypes);
        return `${baseName}!`;
      }
      return 'JSON';
    }
    default: {
      // No explicit type but has properties — treat as object
      if (schema.properties) {
        registerNamedType(baseName, schema, kind, namedTypes);
        return `${baseName}!`;
      }
      return 'JSON';
    }
  }
}

/**
 * Resolves a property's GraphQL type, recursively registering named types for nested objects.
 *
 * @param propSchema - JSON schema for the property
 * @param parentTypeName - Name of the parent type (used to derive nested type names)
 * @param propName - Property name (used to derive nested type names)
 * @param kind - Whether this is an output 'type' or 'input'
 * @param namedTypes - Map to register new named types into
 * @returns GraphQL type string without `!` suffix (caller adds based on required)
 */
const MAX_TYPE_DEPTH = 50;

function resolvePropertyType(
  propSchema: JsonSchema,
  parentTypeName: string,
  propName: string,
  kind: 'type' | 'input',
  namedTypes: Map<string, string>,
  depth = 0,
): string {
  if (depth > MAX_TYPE_DEPTH) return 'JSON';
  if (!propSchema || typeof propSchema !== 'object') return 'JSON';

  const rec = propSchema as Record<string, unknown>;
  const type = rec['type'] as string | undefined;

  switch (type) {
    case 'string': return 'String';
    case 'integer': return 'Int';
    case 'number': return 'Float';
    case 'boolean': return 'Boolean';
    case 'array': {
      const items = rec['items'] as JsonSchema | undefined;
      if (items && typeof items === 'object') {
        const itemRec = items as Record<string, unknown>;
        if (itemRec['type'] === 'object' || itemRec['properties']) {
          const nestedName = `${parentTypeName}${capitalize(propName)}Item`;
          registerNamedType(nestedName, items, kind, namedTypes, depth + 1);
          return `[${nestedName}!]`;
        }
        return `[${resolvePropertyType(items, parentTypeName, propName, kind, namedTypes, depth + 1)}]`;
      }
      return '[JSON]';
    }
    case 'object': {
      if (rec['properties']) {
        const nestedName = `${parentTypeName}${capitalize(propName)}`;
        registerNamedType(nestedName, propSchema, kind, namedTypes, depth + 1);
        return nestedName;
      }
      return 'JSON';
    }
    default: {
      if (rec['properties']) {
        const nestedName = `${parentTypeName}${capitalize(propName)}`;
        registerNamedType(nestedName, propSchema, kind, namedTypes, depth + 1);
        return nestedName;
      }
      return 'JSON';
    }
  }
}

/**
 * Registers a named output `type` or `input` type from a JSON schema.
 * Recursively registers nested object types.
 */
function registerNamedType(
  typeName: string,
  schema: JsonSchema,
  kind: 'type' | 'input',
  namedTypes: Map<string, string>,
  depth = 0,
): void {
  if (namedTypes.has(typeName)) return;
  if (depth > MAX_TYPE_DEPTH) return;

  const keyword = kind === 'input' ? 'input' : 'type';
  const lines: string[] = [`${keyword} ${typeName} {`];
  const properties = schema.properties as Record<string, JsonSchema> | undefined;
  const required = new Set(
    Array.isArray(schema.required) ? (schema.required as string[]) : [],
  );

  if (properties) {
    for (const [propName, propSchema] of Object.entries(properties)) {
      const propType = resolvePropertyType(propSchema, typeName, propName, kind, namedTypes, depth + 1);
      const isNullable = propSchema && typeof propSchema === 'object' && (propSchema as Record<string, unknown>)['nullable'] === true;
      const isRequired = required.has(propName) && !isNullable;
      lines.push(`  ${propName}: ${propType}${isRequired ? '!' : ''}`);
    }
  }

  lines.push('}');
  namedTypes.set(typeName, lines.join('\n'));
}

/**
 * Registers an input type from a JSON schema.
 */
function registerInputType(
  typeName: string,
  schema: JsonSchema,
  namedTypes: Map<string, string>,
): void {
  registerNamedType(typeName, schema, 'input', namedTypes);
}

/**
 * Maps a JSON schema type string to a GraphQL scalar with `!`.
 */
function scalarType(type: string | undefined): string {
  switch (type) {
    case 'string': return 'String!';
    case 'integer': return 'Int!';
    case 'number': return 'Float!';
    case 'boolean': return 'Boolean!';
    default: return 'JSON';
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// JSON Schema Builder (fallback — original behavior)
// ============================================================================

function buildJsonSchema(
  fields: readonly UnifiedGraphQLField[],
  onResolverError?: (error: unknown, fieldKey: string) => void,
): BuiltSchema {
  const queries: UnifiedGraphQLField[] = [];
  const mutations: UnifiedGraphQLField[] = [];
  const subscriptions: UnifiedGraphQLField[] = [];

  for (const field of fields) {
    if (field.operation === 'query') queries.push(field);
    else if (field.operation === 'mutation') mutations.push(field);
    else if (field.operation === 'subscription') subscriptions.push(field);
  }

  const sdlLines: string[] = ['scalar JSON'];

  sdlLines.push('');
  sdlLines.push('type Query {');
  if (queries.length > 0) {
    for (const field of queries) {
      const fieldId = field.metadata.fieldId ?? field.key;
      sdlLines.push(`  ${fieldId}(input: JSON): JSON`);
    }
  } else {
    sdlLines.push('  _health: Boolean');
  }
  sdlLines.push('}');

  if (mutations.length > 0) {
    sdlLines.push('');
    sdlLines.push('type Mutation {');
    for (const field of mutations) {
      const fieldId = field.metadata.fieldId ?? field.key;
      sdlLines.push(`  ${fieldId}(input: JSON): JSON`);
    }
    sdlLines.push('}');
  }

  if (subscriptions.length > 0) {
    sdlLines.push('');
    sdlLines.push('type Subscription {');
    for (const field of subscriptions) {
      const fieldId = field.metadata.fieldId ?? field.key;
      sdlLines.push(`  ${fieldId}(input: JSON): JSON`);
    }
    sdlLines.push('}');
  }

  return {
    typeDefs: sdlLines.join('\n'),
    resolvers: buildResolverMap(fields, queries, mutations, subscriptions, onResolverError),
  };
}

// ============================================================================
// Shared Resolver Builder
// ============================================================================

function buildResolverMap(
  _allFields: readonly UnifiedGraphQLField[],
  queries: UnifiedGraphQLField[],
  mutations: UnifiedGraphQLField[],
  subscriptions: UnifiedGraphQLField[],
  onResolverError?: (error: unknown, fieldKey: string) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvers: Record<string, any> = {
    JSON: GraphQLJSON,
  };

  resolvers['Query'] = {};
  if (queries.length > 0) {
    for (const field of queries) {
      const fieldId = field.metadata.fieldId ?? field.key;
      resolvers['Query'][fieldId] = createResolver(field, onResolverError);
    }
  } else {
    resolvers['Query']['_health'] = () => true;
  }

  if (mutations.length > 0) {
    resolvers['Mutation'] = {};
    for (const field of mutations) {
      const fieldId = field.metadata.fieldId ?? field.key;
      resolvers['Mutation'][fieldId] = createResolver(field, onResolverError);
    }
  }

  if (subscriptions.length > 0) {
    resolvers['Subscription'] = {};
    for (const field of subscriptions) {
      const fieldId = field.metadata.fieldId ?? field.key;
      resolvers['Subscription'][fieldId] = {
        subscribe: createResolver(field, onResolverError),
      };
    }
  }

  return resolvers;
}

function createResolver(
  field: UnifiedGraphQLField,
  onResolverError?: (error: unknown, fieldKey: string) => void,
) {
  return async (
    _parent: unknown,
    args: { input?: unknown },
    context: unknown,
  ): Promise<unknown> => {
    try {
      return await field.handler(args.input, context);
    } catch (error) {
      if (onResolverError) {
        try { onResolverError(error, field.key); } catch { /* don't let logging break the response */ }
      }
      const mapped = mapErrorToGraphQLError(error);
      throw new GraphQLError(mapped.message, {
        extensions: { ...mapped.extensions },
      });
    }
  };
}
