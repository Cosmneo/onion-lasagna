/**
 * @fileoverview Core route definition types (v2 — flat API).
 *
 * A route definition captures all information needed for:
 * - Type-safe client generation
 * - Server-side route registration with automatic validation
 * - OpenAPI specification generation
 *
 * @module unified/route/types/route-definition
 */

import type { SchemaAdapter } from '../../schema/types';
import type { HttpMethod } from './http.type';
import type { PathParams } from './path-params.type';

// ============================================================================
// Documentation Types
// ============================================================================

/**
 * Security requirement for OpenAPI.
 */
export type SecurityRequirement = Readonly<Record<string, readonly string[]>>;

/**
 * External documentation link.
 */
export interface ExternalDocs {
  readonly url: string;
  readonly description?: string;
}

/**
 * Route documentation for OpenAPI generation.
 */
export interface RouteDocumentation {
  /**
   * Short summary of the operation.
   * Should be less than 120 characters.
   */
  readonly summary?: string;

  /**
   * Detailed description of the operation.
   * Supports Markdown formatting.
   */
  readonly description?: string;

  /**
   * Tags for grouping operations in OpenAPI.
   */
  readonly tags?: readonly string[];

  /**
   * Unique operation identifier.
   * If not specified, auto-generated from the router key path.
   */
  readonly operationId?: string;

  /**
   * Whether this operation is deprecated.
   * @default false
   */
  readonly deprecated?: boolean;

  /**
   * Security requirements for this operation.
   * Overrides global security if specified.
   */
  readonly security?: readonly SecurityRequirement[];

  /**
   * External documentation link.
   */
  readonly externalDocs?: ExternalDocs;
}

// ============================================================================
// Schema Field Metadata
// ============================================================================

/**
 * Metadata for a schema field (body, query, params, headers, context).
 *
 * Allows passing OpenAPI metadata alongside a schema without nesting.
 * Each field on `defineRoute` accepts either a bare `SchemaAdapter` or
 * a `SchemaFieldConfig` object:
 *
 * @example Bare schema (common case)
 * ```typescript
 * body: zodSchema(z.object({ name: z.string() }))
 * ```
 *
 * @example With metadata
 * ```typescript
 * body: {
 *   schema: zodSchema(z.object({ name: z.string() })),
 *   description: 'The user to create',
 *   contentType: 'application/json',
 * }
 * ```
 */
export interface SchemaFieldConfig<T extends SchemaAdapter = SchemaAdapter> {
  readonly schema: T;
  /** Description for OpenAPI generation. */
  readonly description?: string;
  /** Content type (body only). @default 'application/json' */
  readonly contentType?: string;
  /** Whether the field is required (body only). @default true */
  readonly required?: boolean;
}

/**
 * A schema field accepts either a bare SchemaAdapter or a config with metadata.
 */
export type SchemaFieldInput<T extends SchemaAdapter = SchemaAdapter> = T | SchemaFieldConfig<T>;

/**
 * Stored metadata for all schema fields on a route.
 * @internal
 */
export interface RouteFieldMeta {
  readonly body?: {
    readonly description?: string;
    readonly contentType?: string;
    readonly required?: boolean;
  };
  readonly query?: { readonly description?: string };
  readonly params?: { readonly description?: string };
  readonly headers?: { readonly description?: string };
  readonly context?: { readonly description?: string };
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Configuration for a single response status code.
 *
 * Used with the `responses` field on `defineRoute` to specify per-status
 * schemas, descriptions, and content types for OpenAPI generation.
 *
 * @example
 * ```typescript
 * responses: {
 *   201: { schema: zodSchema(userSchema), description: 'Created' },
 *   400: { description: 'Validation error' },
 *   409: { description: 'User already exists' },
 * }
 * ```
 */
export interface ResponseFieldConfig {
  readonly schema?: SchemaAdapter;
  readonly description?: string;
  readonly contentType?: string;
}

/**
 * Per-status response definitions keyed by HTTP status code.
 */
export type ResponsesDefinition = Readonly<Record<number, ResponseFieldConfig>>;

/**
 * Extracts the success response SchemaAdapter from a ResponsesDefinition.
 * Cascades through 200 → 201 → 202 → 204.
 */
export type ExtractSuccessSchema<T> = T extends { 200: { schema: infer S extends SchemaAdapter } }
  ? S
  : T extends { 201: { schema: infer S extends SchemaAdapter } }
    ? S
    : T extends { 202: { schema: infer S extends SchemaAdapter } }
      ? S
      : T extends { 204: { schema: infer S extends SchemaAdapter } }
        ? S
        : undefined;

// ============================================================================
// Route Request Definition
// ============================================================================

/**
 * Grouped request schemas for a route definition.
 *
 * Contains all input schemas: body, query, path params, headers, and context.
 * Each field is either a `SchemaAdapter` or `undefined` if not specified.
 */
export interface RouteRequestDefinition<
  TBody = undefined,
  TQuery = undefined,
  TPathParams = Record<string, string>,
  THeaders = undefined,
  TContext = undefined,
> {
  /** Request body schema. */
  readonly body: SchemaAdapter<TBody> | undefined;

  /** Query parameters schema. */
  readonly query: SchemaAdapter<TQuery> | undefined;

  /**
   * Path parameters schema.
   * If not provided, path params are inferred from the path template.
   */
  readonly params: SchemaAdapter<TPathParams> | undefined;

  /** Headers schema. */
  readonly headers: SchemaAdapter<THeaders> | undefined;

  /** Context schema (e.g., JWT payload from middleware). */
  readonly context: SchemaAdapter<TContext> | undefined;
}

// ============================================================================
// Route Definition
// ============================================================================

/**
 * A fully defined route with computed types.
 * This is the output of `defineRoute()`.
 *
 * Request schemas are grouped under `request`:
 * - `request.body`, `request.query`, `request.params`, `request.headers`, `request.context`
 *
 * Responses are per-status via the `responses` field.
 */
export interface RouteDefinition<
  TMethod extends HttpMethod = HttpMethod,
  TPath extends string = string,
  TBody = undefined,
  TQuery = undefined,
  TPathParams = PathParams<TPath>,
  THeaders = undefined,
  TContext = undefined,
  TResponse = undefined,
> {
  /**
   * HTTP method for this route.
   */
  readonly method: TMethod;

  /**
   * URL path pattern.
   */
  readonly path: TPath;

  /**
   * Request schemas (body, query, params, headers, context).
   */
  readonly request: RouteRequestDefinition<TBody, TQuery, TPathParams, THeaders, TContext>;

  /**
   * Per-status response configurations.
   * Each key is an HTTP status code, each value has optional schema, description, and contentType.
   */
  readonly responses: Readonly<Record<string, ResponseFieldConfig>> | undefined;

  /**
   * OpenAPI documentation.
   */
  readonly docs: RouteDocumentation;

  /**
   * Schema field metadata for OpenAPI generation.
   * Populated when fields are passed as `{ schema, description?, contentType?, required? }`.
   * @internal
   */
  readonly _meta: RouteFieldMeta;

  /**
   * Phantom types for TypeScript inference.
   * Never accessed at runtime.
   * @internal
   */
  readonly _types: {
    readonly method: TMethod;
    readonly path: TPath;
    readonly body: TBody;
    readonly query: TQuery;
    readonly pathParams: TPathParams;
    readonly headers: THeaders;
    readonly context: TContext;
    readonly response: TResponse;
  };
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Infers the request body type from a route definition.
 */
export type InferRouteBody<T> =
  T extends RouteDefinition<
    HttpMethod,
    string,
    infer TBody,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >
    ? TBody
    : never;

/**
 * Infers the query params type from a route definition.
 */
export type InferRouteQuery<T> =
  T extends RouteDefinition<
    HttpMethod,
    string,
    unknown,
    infer TQuery,
    unknown,
    unknown,
    unknown,
    unknown
  >
    ? TQuery
    : never;

/**
 * Infers the path params type from a route definition.
 */
export type InferRoutePathParams<T> =
  T extends RouteDefinition<
    HttpMethod,
    string,
    unknown,
    unknown,
    infer TPathParams,
    unknown,
    unknown,
    unknown
  >
    ? TPathParams
    : never;

/**
 * Infers the headers type from a route definition.
 */
export type InferRouteHeaders<T> =
  T extends RouteDefinition<
    HttpMethod,
    string,
    unknown,
    unknown,
    unknown,
    infer THeaders,
    unknown,
    unknown
  >
    ? THeaders
    : never;

/**
 * Infers the context type from a route definition.
 */
export type InferRouteContext<T> =
  T extends RouteDefinition<
    HttpMethod,
    string,
    unknown,
    unknown,
    unknown,
    unknown,
    infer TContext,
    unknown
  >
    ? TContext
    : never;

/**
 * Infers the response type from a route definition.
 */
export type InferRouteResponse<T> =
  T extends RouteDefinition<
    HttpMethod,
    string,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    infer TResponse
  >
    ? TResponse
    : never;

/**
 * Extracts the method from a route definition.
 */
export type InferRouteMethod<T> =
  T extends RouteDefinition<
    infer TMethod,
    string,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >
    ? TMethod
    : never;

/**
 * Extracts the path from a route definition.
 */
export type InferRoutePath<T> =
  T extends RouteDefinition<
    HttpMethod,
    infer TPath,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown
  >
    ? TPath
    : never;
