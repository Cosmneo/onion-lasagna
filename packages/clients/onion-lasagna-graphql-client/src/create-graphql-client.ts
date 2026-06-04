/**
 * @fileoverview Factory function for creating type-safe GraphQL clients.
 *
 * The `createGraphQLClient` function generates a fully-typed GraphQL client
 * from a schema definition. The client provides methods for each field with
 * complete type safety for input and output data.
 *
 * When the field has an output schema, the client automatically generates
 * a full field selection (e.g., `{ id title completed }`) so typed SDL
 * servers return all fields. When no output schema exists, falls back to
 * requesting the field without subselection (JSON scalar mode).
 *
 * @module graphql/client/create-graphql-client
 */

import type {
  GraphQLSchemaConfig,
  GraphQLSchemaDefinition,
  GraphQLFieldDefinition,
} from '@cosmneo/onion-lasagna/graphql/field';
import {
  isFieldDefinition,
  isSchemaDefinition,
  generateFieldId as coreGenerateFieldId,
  collectFields,
} from '@cosmneo/onion-lasagna/graphql/field';
import type { SchemaAdapter, JsonSchema } from '@cosmneo/onion-lasagna/http/schema';
import type {
  GraphQLClientConfig,
  InferGraphQLClient,
  GraphQLResponseError,
  BatchQueryEntry,
  BatchQueryFn,
} from './client-types';
import { GraphQLClientError } from './client-types';

/**
 * Creates a type-safe GraphQL client from a schema definition.
 *
 * The client mirrors the structure of the schema, providing methods
 * for each field with full TypeScript type inference. Output schemas
 * are introspected at build time to generate proper field selections.
 *
 * @param schema - Schema definition or schema config
 * @param config - Client configuration
 * @returns A fully-typed GraphQL client
 *
 * @example Basic usage
 * ```typescript
 * import { createGraphQLClient } from '@cosmneo/onion-lasagna-graphql-client';
 *
 * const client = createGraphQLClient(projectSchema, {
 *   url: 'http://localhost:4000/graphql',
 * });
 *
 * // Fully typed — automatically selects all fields from output schema
 * const user = await client.users.get({ userId: 'U-001' });
 * const projects = await client.projects.list();
 * ```
 */
export function createGraphQLClient<T extends GraphQLSchemaConfig>(
  schema: T | GraphQLSchemaDefinition<T>,
  config: GraphQLClientConfig,
): InferGraphQLClient<T> {
  const fields = isSchemaDefinition(schema) ? schema.fields : schema;
  return buildClientProxy(fields, config, []) as InferGraphQLClient<T>;
}

/**
 * Recursively builds a client proxy from schema config.
 */
function buildClientProxy(
  config: GraphQLSchemaConfig,
  clientConfig: GraphQLClientConfig,
  keyPath: readonly string[],
): Record<string, unknown> {
  const client: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    const currentPath = [...keyPath, key];

    if (isFieldDefinition(value)) {
      client[key] = createFieldMethod(currentPath, value, clientConfig);
    } else if (isSchemaDefinition(value)) {
      client[key] = buildClientProxy(value.fields, clientConfig, currentPath);
    } else if (typeof value === 'object' && value !== null) {
      client[key] = buildClientProxy(value as GraphQLSchemaConfig, clientConfig, currentPath);
    }
  }

  return client;
}

/**
 * Generates a camelCase field ID from a key path array.
 * Delegates to the core `generateFieldId` to keep naming conventions in sync.
 */
function generateFieldId(keyPath: readonly string[]): string {
  return coreGenerateFieldId(keyPath.join('.'));
}

/**
 * Builds a field selection string from an output schema's JSON schema.
 * Returns `{ field1 field2 ... }` for objects, or empty string for scalars/JSON.
 */
function buildSelectionSet(outputSchema: SchemaAdapter | undefined, fieldId: string): string {
  if (!outputSchema) return '';

  const jsonSchema = outputSchema.toJsonSchema();
  return selectionFromJsonSchema(jsonSchema, 0, `${capitalize(fieldId)}Output`);
}

const MAX_SELECTION_DEPTH = 50;

/**
 * Find the literal value of a discriminator-style property in an object schema.
 * Mirrors the same function in generate.ts.
 */
function pickDiscriminatorLabel(schema: Record<string, unknown>): string | null {
  const properties = (schema['properties'] ?? {}) as Record<string, Record<string, unknown>>;
  for (const propSchema of Object.values(properties)) {
    if (!propSchema || typeof propSchema !== 'object') continue;
    const constValue = propSchema['const'];
    if (typeof constValue === 'string' && constValue.length > 0) {
      return constValue;
    }
    const enumValue = propSchema['enum'];
    if (
      Array.isArray(enumValue) &&
      enumValue.length === 1 &&
      typeof enumValue[0] === 'string' &&
      (enumValue[0] as string).length > 0
    ) {
      return enumValue[0] as string;
    }
  }
  return null;
}

/**
 * Pascal-case a string by uppercasing each segment between non-alnum runs.
 * Mirrors the same function in generate.ts.
 */
function pascalize(str: string): string {
  return str
    .split(/[^a-zA-Z0-9]+/g)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Recursively builds a GraphQL selection set from a JSON schema.
 * Depth-limited to prevent stack overflow from circular/deep schemas.
 */
function selectionFromJsonSchema(schema: JsonSchema, depth = 0, unionTypeName?: string): string {
  if (depth > MAX_SELECTION_DEPTH) return '';
  if (!schema || typeof schema !== 'object') return '';

  const rec = schema as Record<string, unknown>;
  const type = rec['type'] as string | undefined;

  // Array — look at items; thread unionTypeName for array-of-union support
  if (type === 'array' && rec['items']) {
    const itemUnionName = unionTypeName ? `${unionTypeName}_Item` : undefined;
    return selectionFromJsonSchema(rec['items'] as JsonSchema, depth + 1, itemUnionName);
  }

  // Union (oneOf / anyOf) — emit inline fragments for each member
  const oneOf = (rec['oneOf'] ?? rec['anyOf']) as JsonSchema[] | undefined;
  if (Array.isArray(oneOf) && oneOf.length > 0) {
    if (!unionTypeName) return '';
    const parts: string[] = ['__typename'];
    const seen = new Set<string>();
    for (let i = 0; i < oneOf.length; i++) {
      const variant = oneOf[i] as Record<string, unknown> | undefined;
      if (!variant || typeof variant !== 'object') continue;
      const variantProps = variant['properties'] as Record<string, JsonSchema> | undefined;
      if (!variantProps) continue;
      const discriminator = pickDiscriminatorLabel(variant);
      let memberName = discriminator
        ? `${unionTypeName}_${pascalize(discriminator)}`
        : `${unionTypeName}_Member${i + 1}`;
      let suffix = 2;
      while (seen.has(memberName)) {
        memberName = `${unionTypeName}_${pascalize(discriminator ?? 'Member')}${suffix++}`;
      }
      seen.add(memberName);
      const memberSel = selectionFromJsonSchema(variant as JsonSchema, depth + 1, undefined);
      if (memberSel) parts.push(`... on ${memberName} ${memberSel}`);
    }
    return parts.length > 1 ? `{ ${parts.join(' ')} }` : '';
  }

  // Object with properties — build selection
  const properties = rec['properties'] as Record<string, JsonSchema> | undefined;
  if (properties) {
    const fields: string[] = [];
    for (const [propName, propSchema] of Object.entries(properties)) {
      // Thread the parent type name so that unions nested inside object
      // properties receive the correct server-matching member type names
      // (e.g. a union at property `status` of `GetDataOutput` becomes
      // `GetDataOutput_Status`, mirroring the SDL generator convention).
      const nestedUnionName = unionTypeName
        ? `${unionTypeName}_${capitalize(propName)}`
        : undefined;
      const nested = selectionFromJsonSchema(propSchema, depth + 1, nestedUnionName);
      if (nested) {
        fields.push(`${propName} ${nested}`);
      } else {
        fields.push(propName);
      }
    }
    if (fields.length > 0) {
      return `{ ${fields.join(' ')} }`;
    }
  }

  return '';
}

/**
 * Builds the input type name for typed SDL mode.
 * Matches the naming convention in build-schema.ts: `${Capitalize<fieldId>}Input`
 */
function buildInputTypeName(fieldId: string): string {
  return `${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}Input`;
}

/**
 * Converts a selection (array or nested object) to a GraphQL selection set string.
 *
 * - `['id', 'title']` → `{ id title }`
 * - `{ id: true, category: { label: true } }` → `{ id category { label } }`
 */
function selectionToString(select: unknown): string {
  if (Array.isArray(select)) {
    return `{ ${select.join(' ')} }`;
  }

  if (select && typeof select === 'object') {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(select)) {
      if (value === true) {
        parts.push(key);
      } else if (value && typeof value === 'object') {
        parts.push(`${key} ${selectionToString(value)}`);
      }
    }
    return parts.length > 0 ? `{ ${parts.join(' ')} }` : '';
  }

  return '';
}

/**
 * Creates a method for a single GraphQL field.
 */
function createFieldMethod(
  keyPath: readonly string[],
  field: GraphQLFieldDefinition,
  config: GraphQLClientConfig,
): (input?: unknown, options?: { select?: unknown }) => Promise<unknown> {
  const fieldId = generateFieldId(keyPath);
  const operationType = field.operation === 'mutation' ? 'mutation' : 'query';

  // Pre-compute the default selection set from the output schema (done once at build time)
  const defaultSelectionSet = buildSelectionSet(field.output as SchemaAdapter | undefined, fieldId);

  // Pre-compute the input type name if input schema exists
  const hasInputSchema = !!field.input;
  const inputTypeName = hasInputSchema ? buildInputTypeName(fieldId) : null;

  return async (input?: unknown, options?: { select?: unknown }) => {
    // Use custom select or fall back to all fields
    const selectionSet = options?.select ? selectionToString(options.select) : defaultSelectionSet;

    // Build the GraphQL query string
    const hasInput = input !== undefined && input !== null;
    let query: string;

    if (hasInput && inputTypeName) {
      // Typed SDL mode: use proper input type name
      query = `${operationType} ${capitalize(fieldId)}($input: ${inputTypeName}!) { ${fieldId}(input: $input) ${selectionSet} }`;
    } else if (hasInput) {
      // JSON scalar fallback
      query = `${operationType} ${capitalize(fieldId)}($input: JSON) { ${fieldId}(input: $input) ${selectionSet} }`;
    } else {
      query = `${operationType} { ${fieldId} ${selectionSet} }`;
    }

    // Build request body
    const body: { query: string; variables?: Record<string, unknown> } = { query };
    if (hasInput) {
      body.variables = { input };
    }

    const json = await executeGraphQLRequest(config, body);
    return json.data?.[fieldId];
  };
}

/**
 * Creates a batch query function that sends multiple fields in a single HTTP request.
 *
 * Each entry in the batch is aliased to avoid field name collisions,
 * allowing different fields (or the same field with different inputs)
 * to be fetched in one round-trip.
 *
 * @param schema - Schema definition or config
 * @param config - Client configuration
 * @returns A function that executes batched queries
 *
 * @example
 * ```typescript
 * const batchQuery = createBatchQuery(schema, { url: '/graphql' });
 *
 * const result = await batchQuery({
 *   ticket: { fieldKey: 'tickets.get', input: { id: 'T-001' }, select: ['subject', 'status'] },
 *   org: { fieldKey: 'organizations.get', input: { id: 'O-001' } },
 * });
 *
 * result.ticket // { subject: '...', status: '...' }
 * result.org    // { id: '...', name: '...', ... }
 * ```
 */
export function createBatchQuery(
  schema: GraphQLSchemaConfig | GraphQLSchemaDefinition,
  config: GraphQLClientConfig,
): BatchQueryFn {
  // Pre-compute a lookup map from the schema (queries only)
  const fieldLookup = new Map<
    string,
    {
      fieldId: string;
      inputTypeName: string | null;
      defaultSelection: string;
    }
  >();
  const mutationKeys = new Set<string>();

  const fields = isSchemaDefinition(schema)
    ? collectFields(schema.fields as GraphQLSchemaConfig)
    : collectFields(schema);

  for (const { key, field } of fields) {
    if (field.operation === 'mutation') {
      mutationKeys.add(key);
      continue;
    }
    const fieldId = coreGenerateFieldId(key);
    fieldLookup.set(key, {
      fieldId,
      inputTypeName: field.input ? buildInputTypeName(fieldId) : null,
      defaultSelection: buildSelectionSet(field.output as SchemaAdapter | undefined, fieldId),
    });
  }

  return async (entries: Record<string, BatchQueryEntry>): Promise<Record<string, unknown>> => {
    const variableDefs: string[] = [];
    const fieldParts: string[] = [];
    const variables: Record<string, unknown> = {};

    for (const [alias, entry] of Object.entries(entries)) {
      if (mutationKeys.has(entry.fieldKey)) {
        throw new GraphQLClientError(
          `Cannot batch mutation "${entry.fieldKey}". batchQuery only supports query fields.`,
          [],
        );
      }

      const lookup = fieldLookup.get(entry.fieldKey);
      if (!lookup) {
        throw new GraphQLClientError(`Unknown field key: "${entry.fieldKey}"`, []);
      }

      const { fieldId, inputTypeName, defaultSelection } = lookup;
      const selectionSet = entry.select ? selectionToString(entry.select) : defaultSelection;

      const hasInput = entry.input !== undefined && entry.input !== null;

      if (hasInput && inputTypeName) {
        const varName = `${alias}_input`;
        variableDefs.push(`$${varName}: ${inputTypeName}!`);
        fieldParts.push(`${alias}: ${fieldId}(input: $${varName}) ${selectionSet}`);
        variables[varName] = entry.input;
      } else if (hasInput) {
        const varName = `${alias}_input`;
        variableDefs.push(`$${varName}: JSON`);
        fieldParts.push(`${alias}: ${fieldId}(input: $${varName}) ${selectionSet}`);
        variables[varName] = entry.input;
      } else {
        fieldParts.push(`${alias}: ${fieldId} ${selectionSet}`);
      }
    }

    const varSection = variableDefs.length > 0 ? `(${variableDefs.join(', ')})` : '';
    const query = `query BatchQuery${varSection} { ${fieldParts.join(' ')} }`;

    const body: { query: string; variables?: Record<string, unknown> } = { query };
    if (Object.keys(variables).length > 0) {
      body.variables = variables;
    }

    const json = await executeGraphQLRequest(config, body);

    // Extract each alias from the response data
    const result: Record<string, unknown> = {};
    for (const alias of Object.keys(entries)) {
      result[alias] = json.data?.[alias];
    }
    return result;
  };
}

// ============================================================================
// Shared HTTP Execution
// ============================================================================

/**
 * Executes a GraphQL HTTP request and returns the parsed response.
 * Shared by both single-field methods and batch queries.
 */
async function executeGraphQLRequest(
  config: GraphQLClientConfig,
  body: { query: string; variables?: Record<string, unknown> },
): Promise<{ data?: Record<string, unknown>; errors?: GraphQLResponseError[] }> {
  const fetchFn = config.fetch ?? fetch;

  // Build headers
  let headers: Record<string, string>;
  if (typeof config.headers === 'function') {
    headers = { ...(await config.headers()) };
  } else {
    headers = { ...(config.headers ?? {}) };
  }
  headers['Content-Type'] = 'application/json';

  // Build request init
  let init: RequestInit = {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  };

  // Apply request interceptor
  if (config.onRequest) {
    init = await config.onRequest(init);
  }

  // Execute request
  let response: Response;
  try {
    response = await fetchFn(config.url, init);
  } catch (error) {
    const clientError = new GraphQLClientError(
      error instanceof Error ? error.message : 'Network error',
      [],
    );
    if (config.onError) {
      await config.onError(clientError);
    }
    throw clientError;
  }

  // Parse response
  let json: { data?: Record<string, unknown>; errors?: GraphQLResponseError[] };
  try {
    json = await response.json();
  } catch {
    const clientError = new GraphQLClientError('Failed to parse GraphQL response', [], response);
    if (config.onError) {
      await config.onError(clientError);
    }
    throw clientError;
  }

  // P03-2: Check HTTP status before inspecting the body.
  // A non-2xx response without a usable GraphQL errors array is an HTTP-level
  // failure (e.g. gateway 401/500) and must not be silently treated as success.
  if (!response.ok && (!json.errors || json.errors.length === 0)) {
    const clientError = new GraphQLClientError(
      `HTTP ${response.status} ${response.statusText}`,
      [],
      response,
    );
    if (config.onError) {
      await config.onError(clientError);
    }
    throw clientError;
  }

  // Check for GraphQL errors.
  // P03-3: When both `data` and `errors` are present (partial success), attach
  // the partial data to the error so batch callers can recover resolved aliases.
  if (json.errors && json.errors.length > 0) {
    const partialData = json.data && Object.keys(json.data).length > 0 ? json.data : undefined;
    const clientError = new GraphQLClientError(
      json.errors[0]!.message,
      json.errors,
      response,
      partialData,
    );
    if (config.onError) {
      await config.onError(clientError);
    }
    throw clientError;
  }

  return json;
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
