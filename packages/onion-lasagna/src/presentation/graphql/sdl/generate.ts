/**
 * @fileoverview GraphQL SDL generation from schema definitions.
 *
 * The `generateGraphQLSDL` function creates a complete GraphQL Schema
 * Definition Language string from a schema definition.
 *
 * Input/output schemas are converted to JSON Schema via `toJsonSchema()`,
 * then mapped to GraphQL type definitions.
 *
 * Supported JSON Schema → GraphQL mappings:
 *   - `type: 'string' | 'integer' | 'number' | 'boolean'` → scalars
 *   - `type: 'array'` → `[T]` (recursing into `items`)
 *   - `enum` → `String` (named enums are a future improvement)
 *   - `type: 'object'` with `properties` → emitted as a named GraphQL
 *     `type`/`input` and reused via the named-types map. Nested object
 *     properties get hierarchical names (`OuterType_Property`) so the
 *     SDL stays valid without dropping to a `JSON` scalar.
 *   - `oneOf` / `anyOf` of object schemas (zod's `discriminatedUnion`
 *     and plain `union`) → emitted as a GraphQL `union` of named member
 *     types. Output types only — GraphQL spec forbids unions in inputs.
 *
 * Truly unrepresentable shapes (e.g. unions of mixed scalars) still
 * fall back to `JSON`. Empty objects (no properties) also fall back so
 * we don't emit invalid empty SDL types.
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

  // Collect all named types that need to be emitted. Insertion order is
  // preserved (Map), so emitted types follow the order in which the
  // generator first encountered them.
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
  const outputRootName = field.output ? `${capitalize(fieldId)}Output` : undefined;

  // Register named input type
  if (field.input && inputTypeName) {
    const jsonSchema = (field.input as SchemaAdapter).toJsonSchema();
    registerInputType(inputTypeName, jsonSchema, namedTypes);
  }

  // Register named output type — `outputTypeName` is what the field's
  // return type signature uses, which differs from `outputRootName` when
  // the schema is a union (the field references the union name; the
  // member object types live alongside it).
  let outputTypeName: string | undefined;
  if (field.output && outputRootName) {
    const jsonSchema = (field.output as SchemaAdapter).toJsonSchema();
    outputTypeName = registerOutputType(outputRootName, jsonSchema, namedTypes);
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
 * Builds a GraphQL input type from a JSON schema, recursing into nested
 * objects (which become their own named input types). Returns the
 * registered type name. Falls back to registering a `JSON`-only marker
 * if the schema has no usable structure.
 */
function registerInputType(
  typeName: string,
  jsonSchema: JsonSchema,
  namedTypes: Map<string, string>,
): string {
  if (namedTypes.has(typeName)) return typeName;

  // Reserve the slot upfront so cycles don't recurse forever.
  namedTypes.set(typeName, '');

  const properties = (jsonSchema.properties ?? {}) as Record<string, JsonSchema>;
  const required = new Set(
    Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : [],
  );

  const lines: string[] = [`input ${typeName} {`];
  for (const [propName, propSchema] of Object.entries(properties)) {
    const graphqlType = jsonSchemaToGraphQLType(
      propSchema,
      `${typeName}_${capitalize(propName)}`,
      namedTypes,
      'input',
    );
    const isRequired = required.has(propName);
    lines.push(`  ${propName}: ${graphqlType}${isRequired ? '!' : ''}`);
  }
  lines.push('}');

  namedTypes.set(typeName, lines.join('\n'));
  return typeName;
}

/**
 * Builds a GraphQL output type (or union) from a JSON schema. Returns
 * the name to use in the field signature. For object schemas this is
 * `typeName`; for `oneOf` / `anyOf` schemas it's also `typeName` but
 * registered as a `union` whose members are named hierarchically.
 */
function registerOutputType(
  typeName: string,
  jsonSchema: JsonSchema,
  namedTypes: Map<string, string>,
): string {
  if (namedTypes.has(typeName)) return typeName;

  // Array-rooted output — emit no named wrapper for the array itself,
  // recurse into the element schema and return `[Element]`. The element
  // type is named after `typeName_Item` so callers writing a list-style
  // query against `meTeamList: [TeamListOutput_Item]` get a meaningful
  // SDL name.
  if (jsonSchema.type === 'array') {
    const items = jsonSchema.items as JsonSchema | undefined;
    if (!items) return '[JSON]';
    const itemTypeName = jsonSchemaToGraphQLType(items, `${typeName}_Item`, namedTypes, 'output');
    return `[${itemTypeName}]`;
  }

  // Union (oneOf / anyOf) at the root output position.
  const variants = pickVariants(jsonSchema);
  if (variants) {
    return registerUnionType(typeName, variants, namedTypes);
  }

  // Reserve before recursing.
  namedTypes.set(typeName, '');

  const properties = (jsonSchema.properties ?? {}) as Record<string, JsonSchema>;
  if (Object.keys(properties).length === 0) {
    // Nothing to emit; fall back to a JSON-shaped placeholder so the
    // field stays usable. We undo the reservation by removing the entry
    // so the caller's signature uses `JSON` instead.
    namedTypes.delete(typeName);
    return 'JSON';
  }

  const required = new Set(
    Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : [],
  );
  const lines: string[] = [`type ${typeName} {`];
  for (const [propName, propSchema] of Object.entries(properties)) {
    const graphqlType = jsonSchemaToGraphQLType(
      propSchema,
      `${typeName}_${capitalize(propName)}`,
      namedTypes,
      'output',
    );
    const isRequired = required.has(propName);
    lines.push(`  ${propName}: ${graphqlType}${isRequired ? '!' : ''}`);
  }
  lines.push('}');

  namedTypes.set(typeName, lines.join('\n'));
  return typeName;
}

/**
 * Build a GraphQL union for an `oneOf` / `anyOf` schema. Each branch
 * must be an object schema; non-object branches make the union
 * unrepresentable and we fall back to `JSON`. Member types are named
 * after the discriminator literal when one is present (zod's
 * `discriminatedUnion` produces a `const` literal on the discriminator
 * field), otherwise positional (`Member1`, `Member2`).
 */
function registerUnionType(
  typeName: string,
  variants: JsonSchema[],
  namedTypes: Map<string, string>,
): string {
  if (namedTypes.has(typeName)) return typeName;

  // Reserve.
  namedTypes.set(typeName, '');

  const memberNames: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    if (!variant || !isObjectSchema(variant)) {
      // Mixed-type union — bail. Drop the reservation so the field
      // signature falls back to `JSON`.
      namedTypes.delete(typeName);
      return 'JSON';
    }
    const discriminator = pickDiscriminatorLabel(variant);
    let memberName = discriminator
      ? `${typeName}_${pascalize(discriminator)}`
      : `${typeName}_Member${i + 1}`;
    // Ensure uniqueness within this union (two branches with the same
    // discriminator would be a Zod modelling bug, but we keep the
    // generator robust).
    let suffix = 2;
    while (seen.has(memberName)) {
      memberName = `${typeName}_${pascalize(discriminator ?? 'Member')}${suffix++}`;
    }
    seen.add(memberName);
    registerOutputType(memberName, variant, namedTypes);
    memberNames.push(memberName);
  }

  namedTypes.set(typeName, `union ${typeName} = ${memberNames.join(' | ')}`);
  return typeName;
}

/**
 * Returns the variant list for a `oneOf` / `anyOf` schema, or `null` if
 * the schema doesn't carry one. `allOf` is not treated as a union — it
 * means "intersect all" and the JSON schema produced by Zod for plain
 * objects with shared fields would use it; we leave that as a future
 * improvement.
 */
function pickVariants(schema: JsonSchema): JsonSchema[] | null {
  if (Array.isArray(schema.oneOf)) return schema.oneOf as JsonSchema[];
  if (Array.isArray(schema.anyOf)) return schema.anyOf as JsonSchema[];
  return null;
}

/**
 * Treat a schema as an object if it has `type: 'object'` or carries
 * `properties` (zod sometimes omits the explicit type when the shape is
 * obvious).
 */
function isObjectSchema(schema: JsonSchema): boolean {
  if (!schema || typeof schema !== 'object') return false;
  if (schema.type === 'object') return true;
  if (schema.properties && typeof schema.properties === 'object') return true;
  return false;
}

/**
 * Find the literal value of a discriminator-style property in an object
 * schema. Zod's `z.discriminatedUnion('kind', [...])` emits each branch
 * with `properties.kind = { type: 'string', const: 'MEMBER' }` (or
 * `enum: ['MEMBER']`). We surface that literal so union member type
 * names can carry domain meaning instead of positional indexes.
 */
function pickDiscriminatorLabel(schema: JsonSchema): string | null {
  const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
  for (const propSchema of Object.values(properties)) {
    if (!propSchema || typeof propSchema !== 'object') continue;
    const constValue = (propSchema as { const?: unknown }).const;
    if (typeof constValue === 'string' && constValue.length > 0) {
      return constValue;
    }
    const enumValue = (propSchema as { enum?: unknown[] }).enum;
    if (
      Array.isArray(enumValue) &&
      enumValue.length === 1 &&
      typeof enumValue[0] === 'string' &&
      enumValue[0].length > 0
    ) {
      return enumValue[0];
    }
  }
  return null;
}

/**
 * Converts a JSON schema fragment to a GraphQL type expression.
 *
 * For nested object shapes the function registers a new named type via
 * the supplied `namedTypes` map and returns its name. Arrays produce
 * `[ItemType]` and recurse into the element schema. Scalars map to the
 * GraphQL built-ins. Anything we can't represent (e.g. mixed-type
 * unions, schemas with no shape information) falls back to the `JSON`
 * scalar so the field stays queryable as an opaque value.
 *
 * `kind: 'input'` walks down through `registerInputType` so nested
 * structures stay on the input-types side; `kind: 'output'` mirrors
 * that for output types and unions.
 */
function jsonSchemaToGraphQLType(
  schema: JsonSchema,
  parentTypeName: string,
  namedTypes: Map<string, string>,
  kind: 'input' | 'output',
): string {
  if (!schema || typeof schema !== 'object') return 'JSON';

  // Handle enum (single-value enums and full enums alike → String for
  // now; named GraphQL enums are a future improvement).
  if (schema.enum && Array.isArray(schema.enum)) {
    return 'String';
  }

  // Union — only meaningful at output-position. Inputs collapse to JSON
  // because the GraphQL spec forbids unions in input types.
  const variants = pickVariants(schema);
  if (variants) {
    if (kind === 'input') return 'JSON';
    return registerUnionType(parentTypeName, variants, namedTypes);
  }

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
      if (!items) return '[JSON]';
      const itemType = jsonSchemaToGraphQLType(
        items,
        // Singular-ish name for array element types — drop a trailing
        // 's' when present so `Tags[]` becomes `…_Tag`. Cheap heuristic;
        // fine for the conventional case.
        parentTypeName.replace(/s$/, ''),
        namedTypes,
        kind,
      );
      return `[${itemType}]`;
    }
    case 'object':
      if (kind === 'input') {
        return registerInputType(parentTypeName, schema, namedTypes);
      }
      return registerOutputType(parentTypeName, schema, namedTypes);
    default:
      // Object without explicit type but has properties.
      if (isObjectSchema(schema)) {
        if (kind === 'input') {
          return registerInputType(parentTypeName, schema, namedTypes);
        }
        return registerOutputType(parentTypeName, schema, namedTypes);
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
 * Pascal-case a string by uppercasing each segment between non-alnum
 * runs. Used to turn discriminator literals (which may be `kebab-case`,
 * `snake_case`, or `UPPER_SNAKE`) into safe GraphQL type-name segments.
 */
function pascalize(str: string): string {
  return str
    .split(/[^a-zA-Z0-9]+/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
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
