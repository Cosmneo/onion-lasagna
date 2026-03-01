/**
 * @fileoverview Factory function for creating route definitions (v2).
 *
 * The `defineRoute` function is the main entry point for defining routes.
 * Request schemas are grouped under a `request` field, while responses
 * are defined via the `responses` field with per-status-code config.
 *
 * Each schema field accepts either a bare `SchemaAdapter` or an object with
 * metadata: `{ schema, description?, contentType?, required? }`.
 *
 * The success response type is inferred from the first 2xx status with a schema.
 *
 * @module unified/route/define-route
 */

import type { SchemaAdapter, InferOutput } from '../schema/types';
import { isSchemaAdapter } from '../schema/types';
import type {
  HttpMethod,
  RouteDefinition,
  PathParams,
  SchemaFieldInput,
  RouteFieldMeta,
  ResponseFieldConfig,
  ResponsesDefinition,
  ExtractSuccessSchema,
} from './types';

// ============================================================================
// Input Types
// ============================================================================

/**
 * Complete input for defineRoute.
 *
 * @example GET with query and response
 * ```typescript
 * defineRoute({
 *   method: 'GET',
 *   path: '/api/users',
 *   request: {
 *     query: zodSchema(z.object({ page: z.coerce.number().default(1) })),
 *   },
 *   responses: {
 *     200: { schema: zodSchema(userListSchema) },
 *   },
 *   docs: { summary: 'List users', tags: ['Users'] },
 * })
 * ```
 *
 * @example POST with body and multiple statuses
 * ```typescript
 * defineRoute({
 *   method: 'POST',
 *   path: '/api/users',
 *   request: {
 *     body: zodSchema(createUserSchema),
 *   },
 *   responses: {
 *     201: { schema: zodSchema(userSchema), description: 'Created' },
 *     400: { description: 'Validation error' },
 *     409: { description: 'Email already in use' },
 *   },
 * })
 * ```
 *
 * @example DELETE with 204
 * ```typescript
 * defineRoute({
 *   method: 'DELETE',
 *   path: '/api/users/:userId',
 *   responses: {
 *     204: { description: 'User deleted' },
 *     404: { description: 'User not found' },
 *   },
 * })
 * ```
 */
interface DefineRouteInput<
  TMethod extends HttpMethod,
  TPath extends string,
  TBody extends SchemaAdapter | undefined = undefined,
  TQuery extends SchemaAdapter | undefined = undefined,
  TParams extends SchemaAdapter | undefined = undefined,
  THeaders extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
  TResponses extends ResponsesDefinition | undefined = undefined,
> {
  /** HTTP method for this route. */
  readonly method: TMethod;

  /** URL path pattern with optional parameters (`:param` or `{param}`). */
  readonly path: TPath;

  /** Request schemas (body, query, params, headers, context). */
  readonly request?: {
    /** Request body schema (or `{ schema, description?, contentType?, required? }`). */
    readonly body?: TBody extends SchemaAdapter ? SchemaFieldInput<TBody> : TBody;

    /** Query parameters schema (or `{ schema, description? }`). */
    readonly query?: TQuery extends SchemaAdapter ? SchemaFieldInput<TQuery> : TQuery;

    /** Path parameters schema (or `{ schema, description? }`). If omitted, inferred from path template. */
    readonly params?: TParams extends SchemaAdapter ? SchemaFieldInput<TParams> : TParams;

    /** Headers schema (or `{ schema, description? }`). */
    readonly headers?: THeaders extends SchemaAdapter ? SchemaFieldInput<THeaders> : THeaders;

    /** Context schema (or `{ schema, description? }`). */
    readonly context?: TContext extends SchemaAdapter ? SchemaFieldInput<TContext> : TContext;
  };

  /**
   * Per-status response definitions.
   *
   * Each key is an HTTP status code. Each value can have:
   * - `schema` — response body schema (drives type inference for 2xx)
   * - `description` — OpenAPI response description
   * - `contentType` — response content type (default: `application/json`)
   */
  readonly responses?: TResponses;

  /** OpenAPI documentation. */
  readonly docs?: {
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly operationId?: string;
    readonly deprecated?: boolean;
    readonly security?: readonly Record<string, readonly string[]>[];
    readonly externalDocs?: {
      readonly url: string;
      readonly description?: string;
    };
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts the SchemaAdapter from a field that may be bare or wrapped in config.
 */
function extractSchema<T extends SchemaAdapter>(
  field: SchemaFieldInput<T> | undefined,
): T | undefined {
  if (field == null) return undefined;
  if (isSchemaAdapter(field)) return field as T;
  return (field as { schema: T }).schema;
}

/**
 * Extracts metadata from a field config, if it was passed as an object.
 */
function extractMeta(
  field: SchemaFieldInput | undefined,
): { description?: string; contentType?: string; required?: boolean } | undefined {
  if (field == null || isSchemaAdapter(field)) return undefined;
  const config = field as { description?: string; contentType?: string; required?: boolean };
  if (config.description == null && config.contentType == null && config.required == null) {
    return undefined;
  }
  return {
    description: config.description,
    contentType: config.contentType,
    required: config.required,
  };
}

/**
 * Normalizes responses record keys to strings.
 */
function normalizeResponses(
  responses: Record<string | number, ResponseFieldConfig>,
): Record<string, ResponseFieldConfig> {
  const result: Record<string, ResponseFieldConfig> = {};
  for (const [key, value] of Object.entries(responses)) {
    result[String(key)] = value;
  }
  return result;
}

// ============================================================================
// Return type helpers
// ============================================================================

type ResolveBody<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;
type ResolveQuery<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;
type ResolveParams<T, TPath extends string> = T extends SchemaAdapter
  ? InferOutput<T>
  : PathParams<TPath>;
type ResolveHeaders<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;
type ResolveContext<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;

type ResolveResponse<T> = T extends ResponsesDefinition
  ? ExtractSuccessSchema<T> extends SchemaAdapter
    ? InferOutput<ExtractSuccessSchema<T>>
    : undefined
  : undefined;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a route definition from the provided configuration.
 *
 * This is the main entry point for defining routes. The resulting definition
 * can be used for type-safe client generation, server-side route registration,
 * and OpenAPI specification generation.
 *
 * @param input - Route configuration with request schemas and responses
 * @returns A frozen RouteDefinition object with full type information
 */
export function defineRoute<
  TMethod extends HttpMethod,
  TPath extends string,
  TBody extends SchemaAdapter | undefined = undefined,
  TQuery extends SchemaAdapter | undefined = undefined,
  TParams extends SchemaAdapter | undefined = undefined,
  THeaders extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
  TResponses extends ResponsesDefinition | undefined = undefined,
>(
  input: DefineRouteInput<TMethod, TPath, TBody, TQuery, TParams, THeaders, TContext, TResponses>,
): RouteDefinition<
  TMethod,
  TPath,
  ResolveBody<TBody>,
  ResolveQuery<TQuery>,
  ResolveParams<TParams, TPath>,
  ResolveHeaders<THeaders>,
  ResolveContext<TContext>,
  ResolveResponse<TResponses>
> {
  const req = input.request;

  // Build _meta from any config-wrapped fields
  const bodyMeta = extractMeta(req?.body as SchemaFieldInput | undefined);
  const queryMeta = extractMeta(req?.query as SchemaFieldInput | undefined);
  const paramsMeta = extractMeta(req?.params as SchemaFieldInput | undefined);
  const headersMeta = extractMeta(req?.headers as SchemaFieldInput | undefined);
  const contextMeta = extractMeta(req?.context as SchemaFieldInput | undefined);

  const _meta: RouteFieldMeta = {
    ...(bodyMeta ? { body: bodyMeta } : {}),
    ...(queryMeta ? { query: { description: queryMeta.description } } : {}),
    ...(paramsMeta ? { params: { description: paramsMeta.description } } : {}),
    ...(headersMeta ? { headers: { description: headersMeta.description } } : {}),
    ...(contextMeta ? { context: { description: contextMeta.description } } : {}),
  };

  const definition = {
    method: input.method,
    path: input.path,
    request: {
      body: extractSchema(req?.body as SchemaFieldInput | undefined) ?? undefined,
      query: extractSchema(req?.query as SchemaFieldInput | undefined) ?? undefined,
      params: extractSchema(req?.params as SchemaFieldInput | undefined) ?? undefined,
      headers: extractSchema(req?.headers as SchemaFieldInput | undefined) ?? undefined,
      context: extractSchema(req?.context as SchemaFieldInput | undefined) ?? undefined,
    },
    responses: input.responses ? normalizeResponses(input.responses) : undefined,
    docs: {
      summary: input.docs?.summary,
      description: input.docs?.description,
      tags: input.docs?.tags,
      operationId: input.docs?.operationId,
      deprecated: input.docs?.deprecated ?? false,
      security: input.docs?.security,
      externalDocs: input.docs?.externalDocs,
    },
    _meta,
    _types: undefined as unknown,
  };

  return Object.freeze(definition) as RouteDefinition<
    TMethod,
    TPath,
    ResolveBody<TBody>,
    ResolveQuery<TQuery>,
    ResolveParams<TParams, TPath>,
    ResolveHeaders<THeaders>,
    ResolveContext<TContext>,
    ResolveResponse<TResponses>
  >;
}
