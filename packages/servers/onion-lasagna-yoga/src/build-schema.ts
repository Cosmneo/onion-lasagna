/**
 * @fileoverview Builds a GraphQL executable schema from UnifiedGraphQLField[].
 *
 * Two modes:
 * - **Typed mode** (when schema definition is provided): Delegates SDL generation
 *   to core `generateGraphQLSDL`, which correctly handles nullable root fields,
 *   unions, enums, and nested types.
 * - **JSON mode** (fallback): Uses JSON scalar for all fields — simpler but no
 *   field selection support.
 *
 * @module graphql/frameworks/yoga/build-schema
 */

import type { UnifiedGraphQLField } from '@cosmneo/onion-lasagna/graphql/server';
import type {
  GraphQLSchemaConfig,
  GraphQLSchemaDefinition,
} from '@cosmneo/onion-lasagna/graphql/field';
import { isSchemaDefinition } from '@cosmneo/onion-lasagna/graphql/field';
import { generateFieldId } from '@cosmneo/onion-lasagna/graphql/field';
import {
  generateGraphQLSDLWithMeta,
  type GraphQLUnionMetadata,
} from '@cosmneo/onion-lasagna/graphql/sdl';
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

/**
 * Drops trailing `!` from every field inside output `type` blocks.
 *
 * Core's `generateGraphQLSDL` marks required nested props with `!` based on
 * JSON-schema `required` arrays, which reflect input-validation presence, not
 * "resolver always returns this field". A resolver omitting a required prop would
 * crash the parent object. We drop `!` from all output type fields so every nested
 * field is nullable at the GraphQL layer — resolver null becomes GraphQL null
 * instead of an error.
 *
 * Rules:
 * - Only touches `type X { ... }` blocks (NOT `input X { ... }` — required
 *   inputs must stay non-null).
 * - Never touches root `type Query`, `type Mutation`, `type Subscription` blocks
 *   (core already emits those without `!`).
 * - Never touches `union` definitions or `scalar` declarations.
 * - Never touches inline argument types (those live inside `input` blocks).
 */
export function relaxOutputNonNull(sdl: string): string {
  const ROOT_TYPES = new Set(['Query', 'Mutation', 'Subscription']);

  const lines = sdl.split('\n');
  const result: string[] = [];

  let insideOutputType = false; // true when inside a non-root, non-input type block

  for (const line of lines) {
    const trimmed = line.trimStart();

    // Detect block start
    const typeMatch = /^type\s+(\w+)\s*\{/.exec(trimmed);
    if (typeMatch) {
      const typeName = typeMatch[1] ?? '';
      // Non-root output type block: relax non-null
      insideOutputType = !ROOT_TYPES.has(typeName);
      result.push(line);
      continue;
    }

    // Detect input / union / scalar block start — do NOT relax
    if (/^(input|union|scalar|enum|interface)\s/.test(trimmed)) {
      insideOutputType = false;
      result.push(line);
      continue;
    }

    // Detect block end
    if (trimmed === '}') {
      insideOutputType = false;
      result.push(line);
      continue;
    }

    // Inside a non-root output type: strip trailing `!` from field type
    // but preserve `!` on inline input arg types (those appear inside
    // parentheses on the same field line, e.g. `field(arg: String!): Type`).
    if (insideOutputType && trimmed.length > 0 && !trimmed.startsWith('#')) {
      result.push(relaxFieldLine(line));
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * For a single field line inside an output type, drops the trailing `!` from the
 * return-type position while leaving argument types (`(arg: X!)`) untouched.
 *
 * Examples:
 *   `  id: String!`            → `  id: String`
 *   `  tags: [String!]!`       → `  tags: [String!]`   (inner `!` stays for list items)
 *   `  nested: NestedType!`    → `  nested: NestedType`
 *   `  field(a: Int!): String!`→ `  field(a: Int!): String`
 */
function relaxFieldLine(line: string): string {
  // Find the return-type portion: everything after the last `:` that is NOT
  // inside parentheses (argument section).
  const parenDepth = { depth: 0 };
  let colonPos = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '(') {
      parenDepth.depth++;
    } else if (ch === ')') {
      parenDepth.depth--;
    } else if (ch === ':' && parenDepth.depth === 0) {
      colonPos = i;
    }
  }

  if (colonPos === -1) return line;

  const before = line.slice(0, colonPos + 1);
  const after = line.slice(colonPos + 1);

  // Drop the trailing `!` from the type expression (after stripping directives
  // like `@deprecated`). We only drop the outermost `!` — the one that makes
  // the field non-null. Inner `!` on list item types are intentional.
  // Pattern: strip trailing `!` that appears before any trailing directive or whitespace.
  const relaxed = after.replace(/!(\s*(?:@\w[^\n]*)?\s*)$/, '$1');

  return before + relaxed;
}

function buildTypedSchema(
  fields: readonly UnifiedGraphQLField[],
  schema: GraphQLSchemaConfig | GraphQLSchemaDefinition,
  onResolverError?: (error: unknown, fieldKey: string) => void,
): BuiltSchema {
  const config = isSchemaDefinition(schema) ? schema.fields : schema;

  // Partition fields by operation for resolver-map building
  const queries: UnifiedGraphQLField[] = [];
  const mutations: UnifiedGraphQLField[] = [];
  const subscriptions: UnifiedGraphQLField[] = [];

  for (const field of fields) {
    if (field.operation === 'query') queries.push(field);
    else if (field.operation === 'mutation') mutations.push(field);
    else if (field.operation === 'subscription') subscriptions.push(field);
  }

  // Delegate SDL generation to the core generator.
  // `preamble: 'scalar JSON'` is required: core may produce fields typed as `JSON`
  // (for unrepresentable shapes) but never declares the scalar itself.
  // Using generateGraphQLSDLWithMeta so we also get union metadata for __resolveType.
  const sdlResult = generateGraphQLSDLWithMeta(config, {
    preamble: 'scalar JSON',
    includeDescriptions: true,
    includeDeprecations: true,
  });
  let typeDefs = sdlResult.sdl;
  const unionsMeta = sdlResult.unions;

  // Relax `!` on nested output type fields (CRITICAL #6).
  // Core marks required nested props non-null based on JSON-schema `required`,
  // but that means "present in input validation", not "resolver always returns it".
  typeDefs = relaxOutputNonNull(typeDefs);

  // Edge case: generateGraphQLSDL emits no `type Query` when zero query fields,
  // but GraphQL requires a root Query type.
  if (!typeDefs.includes('type Query')) {
    typeDefs = typeDefs.trimEnd() + '\ntype Query {\n  _health: Boolean\n}\n';
  }

  // In typed mode, resolver keys must match SDL field names, which core generates
  // via generateFieldId(key). We pass that mapper so HIGH #21 is fixed.
  const fieldIdFor = (f: UnifiedGraphQLField) => generateFieldId(f.key);

  return {
    typeDefs,
    resolvers: buildResolverMap(
      fields,
      queries,
      mutations,
      subscriptions,
      onResolverError,
      fieldIdFor,
      unionsMeta,
    ),
  };
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
  // When provided, keys resolvers by this function (typed mode: generateFieldId).
  // When absent, falls back to field.metadata.fieldId ?? field.key (JSON mode).
  fieldIdFor?: (f: UnifiedGraphQLField) => string,
  // Union metadata from generateGraphQLSDLWithMeta — used to synthesize
  // __resolveType for every generated union type (P01-1).
  unions?: Readonly<Record<string, GraphQLUnionMetadata>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const resolveId = (f: UnifiedGraphQLField) =>
    fieldIdFor ? fieldIdFor(f) : (f.metadata.fieldId ?? f.key);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvers: Record<string, any> = {
    JSON: GraphQLJSON,
  };

  resolvers['Query'] = {};
  if (queries.length > 0) {
    for (const field of queries) {
      resolvers['Query'][resolveId(field)] = createResolver(field, onResolverError);
    }
  } else {
    resolvers['Query']['_health'] = () => true;
  }

  if (mutations.length > 0) {
    resolvers['Mutation'] = {};
    for (const field of mutations) {
      resolvers['Mutation'][resolveId(field)] = createResolver(field, onResolverError);
    }
  }

  if (subscriptions.length > 0) {
    resolvers['Subscription'] = {};
    for (const field of subscriptions) {
      // P01-2: GraphQL requires a { subscribe, resolve } pair for subscriptions.
      // `subscribe` returns the AsyncIterable (each item already per-validated by core).
      // `resolve` extracts the payload from each yielded item for delivery to clients.
      resolvers['Subscription'][resolveId(field)] = {
        subscribe: createResolver(field, onResolverError),
        resolve: (payload: unknown) => payload,
      };
    }
  }

  // P01-1: Synthesize __resolveType for every generated union type.
  // The core SDL generator names union members as `${unionName}_${pascalize(label)}`
  // where `label` is the discriminator literal value (e.g. `'a'` → `'A'`).
  // At runtime we look up `obj[discriminatorField]`, pascalize it, and return the
  // matching member type name.
  if (unions) {
    for (const [unionName, meta] of Object.entries(unions)) {
      const { members, discriminatorField } = meta;
      if (discriminatorField) {
        // Build a lookup from pascalized discriminator value to member type name.
        const lookup: Record<string, string> = {};
        for (const memberName of members) {
          // The member name is `${unionName}_${suffix}` where suffix = pascalize(label).
          const suffix = memberName.slice(unionName.length + 1); // strip `${unionName}_`
          lookup[suffix] = memberName;
        }

        resolvers[unionName] = {
          __resolveType: (obj: unknown) => {
            if (obj === null || typeof obj !== 'object') return null;
            const raw = (obj as Record<string, unknown>)[discriminatorField];
            if (typeof raw !== 'string') return null;
            const key = pascalizeLabel(raw);
            return lookup[key] ?? null;
          },
        };
      } else {
        // No discriminator — positional members. Return null and let GraphQL's
        // default resolution handle it (or rely on __typename being set).
        resolvers[unionName] = {
          __resolveType: () => null,
        };
      }
    }
  }

  return resolvers;
}

/**
 * Pascal-cases a discriminator literal to match the suffix appended by the
 * core SDL generator when naming union member types.
 *
 * Must mirror `pascalize()` in `@cosmneo/onion-lasagna/graphql/sdl/generate.ts`:
 *   - Split on non-alphanumeric runs
 *   - Uppercase first char of each segment, lowercase the rest
 *   - Join
 *
 * Examples: 'a' → 'A', 'some-type' → 'SomeType', 'STATUS_OK' → 'StatusOk'
 */
function pascalizeLabel(str: string): string {
  return str
    .split(/[^a-zA-Z0-9]+/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
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
        try {
          onResolverError(error, field.key);
        } catch {
          /* don't let logging break the response */
        }
      }
      const mapped = mapErrorToGraphQLError(error);
      throw new GraphQLError(mapped.message, {
        extensions: { ...mapped.extensions },
      });
    }
  };
}
