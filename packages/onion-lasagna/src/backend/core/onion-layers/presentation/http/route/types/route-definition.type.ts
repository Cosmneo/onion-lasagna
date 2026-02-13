/**
 * @fileoverview Core route definition types.
 *
 * This module defines the types for the unified route system. A route
 * definition captures all information needed for:
 * - Type-safe client generation
 * - Server-side route registration with automatic validation
 * - OpenAPI specification generation
 *
 * @module unified/route/types/route-definition
 */

import type { SchemaAdapter } from '../../schema/types';
import type { ContentType, HttpMethod, HttpStatusCode } from './http.type';
import type { PathParams } from './path-params.type';

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request body configuration.
 */
export interface RequestBodyConfig<T = unknown> {
  /**
   * Schema for validating the request body.
   */
  readonly schema: SchemaAdapter<T>;

  /**
   * Content type of the request body.
   * @default 'application/json'
   */
  readonly contentType?: ContentType;

  /**
   * Whether the body is required.
   * @default true
   */
  readonly required?: boolean;

  /**
   * Description for OpenAPI documentation.
   */
  readonly description?: string;
}

/**
 * Query parameters configuration.
 */
export interface QueryParamsConfig<T = unknown> {
  /**
   * Schema for validating query parameters.
   */
  readonly schema: SchemaAdapter<T>;

  /**
   * Description for OpenAPI documentation.
   */
  readonly description?: string;
}

/**
 * Path parameters configuration (optional override).
 * By default, path params are extracted from the path template.
 */
export interface PathParamsConfig<T = unknown> {
  /**
   * Schema for validating path parameters.
   * If provided, overrides the auto-extracted types from the path.
   */
  readonly schema: SchemaAdapter<T>;

  /**
   * Description for OpenAPI documentation.
   */
  readonly description?: string;
}

/**
 * Headers configuration.
 */
export interface HeadersConfig<T = unknown> {
  /**
   * Schema for validating headers.
   */
  readonly schema: SchemaAdapter<T>;

  /**
   * Description for OpenAPI documentation.
   */
  readonly description?: string;
}

/**
 * Context configuration.
 * Used to validate and type context data from middleware (e.g., JWT payload).
 */
export interface ContextConfig<T = unknown> {
  /**
   * Schema for validating context data.
   * Context is extracted by the framework adapter's contextExtractor.
   */
  readonly schema: SchemaAdapter<T>;

  /**
   * Description for documentation.
   */
  readonly description?: string;
}

/**
 * Complete request configuration.
 */
export interface RequestConfig<
  TBody = undefined,
  TQuery = undefined,
  TParams = undefined,
  THeaders = undefined,
  TContext = undefined,
> {
  /**
   * Request body schema and configuration.
   */
  readonly body?: TBody extends undefined ? undefined : RequestBodyConfig<TBody>;

  /**
   * Query parameters schema and configuration.
   */
  readonly query?: TQuery extends undefined ? undefined : QueryParamsConfig<TQuery>;

  /**
   * Path parameters schema and configuration.
   * Optional - by default inferred from path template.
   */
  readonly params?: TParams extends undefined ? undefined : PathParamsConfig<TParams>;

  /**
   * Headers schema and configuration.
   */
  readonly headers?: THeaders extends undefined ? undefined : HeadersConfig<THeaders>;

  /**
   * Context schema and configuration.
   * Validates context data extracted from middleware (e.g., JWT payload).
   * Validation failure throws InternalServerError.
   */
  readonly context?: TContext extends undefined ? undefined : ContextConfig<TContext>;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Single response configuration.
 */
export interface ResponseConfig<T = unknown> {
  /**
   * Description for OpenAPI documentation.
   * Required for OpenAPI compliance.
   */
  readonly description: string;

  /**
   * Schema for the response body.
   * Optional - some responses (204, 3xx) have no body.
   */
  readonly schema?: SchemaAdapter<T>;

  /**
   * Content type of the response body.
   * @default 'application/json'
   */
  readonly contentType?: ContentType;

  /**
   * Response headers schema.
   */
  readonly headers?: SchemaAdapter<Record<string, string>>;
}

/**
 * Map of status codes to response configurations.
 * Defined as an interface so IDE hovers show "ResponsesConfig"
 * instead of expanding all ~60 HTTP status code keys.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Interface extends the mapped type to control IDE display
export interface ResponsesConfig
  extends Readonly<Partial<Record<HttpStatusCode, ResponseConfig>>> {}

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
   * Must be unique across all operations.
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
// Route Definition Types
// ============================================================================

/**
 * Input for defining a route.
 * This is what users provide to `defineRoute()`.
 */
export interface RouteDefinitionInput<
  TMethod extends HttpMethod = HttpMethod,
  TPath extends string = string,
  TBody = undefined,
  TQuery = undefined,
  TPathParams = PathParams<TPath>,
  THeaders = undefined,
  TContext = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
> {
  /**
   * HTTP method for this route.
   */
  readonly method: TMethod;

  /**
   * URL path pattern with optional parameters.
   *
   * @example
   * '/api/users'
   * '/api/users/:userId'
   * '/api/projects/{projectId}/tasks/{taskId}'
   */
  readonly path: TPath;

  /**
   * Request configuration including body, query, params, headers, and context.
   */
  readonly request?: {
    readonly body?: RequestBodyConfig<TBody>;
    readonly query?: QueryParamsConfig<TQuery>;
    readonly params?: PathParamsConfig<TPathParams>;
    readonly headers?: HeadersConfig<THeaders>;
    readonly context?: ContextConfig<TContext>;
  };

  /**
   * Response configurations by status code.
   */
  readonly responses: TResponses;

  /**
   * OpenAPI documentation.
   */
  readonly docs?: RouteDocumentation;
}

/**
 * A fully defined route with computed types.
 * This is the output of `defineRoute()`.
 */
export interface RouteDefinition<
  TMethod extends HttpMethod = HttpMethod,
  TPath extends string = string,
  TBody = undefined,
  TQuery = undefined,
  TPathParams = PathParams<TPath>,
  THeaders = undefined,
  TContext = undefined,
  TResponses extends ResponsesConfig = ResponsesConfig,
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
   * Request configuration.
   */
  readonly request: {
    readonly body: RequestBodyConfig<TBody> | undefined;
    readonly query: QueryParamsConfig<TQuery> | undefined;
    readonly params: PathParamsConfig<TPathParams> | undefined;
    readonly headers: HeadersConfig<THeaders> | undefined;
    readonly context: ContextConfig<TContext> | undefined;
  };

  /**
   * Response configurations.
   */
  readonly responses: TResponses;

  /**
   * OpenAPI documentation.
   */
  readonly docs: RouteDocumentation;

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
    readonly responses: TResponses;
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
    ResponsesConfig
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
    ResponsesConfig
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
    ResponsesConfig
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
    ResponsesConfig
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
    ResponsesConfig
  >
    ? TContext
    : never;

/**
 * Infers the response type for a specific status code.
 */
export type InferRouteResponse<T, TStatus extends HttpStatusCode> =
  T extends RouteDefinition<
    HttpMethod,
    string,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    infer TResponses
  >
    ? TStatus extends keyof TResponses
      ? TResponses[TStatus] extends ResponseConfig<infer TData>
        ? TData
        : never
      : never
    : never;

/**
 * Infers the successful response type (first 2xx response).
 */
export type InferRouteSuccessResponse<T> =
  T extends RouteDefinition<
    HttpMethod,
    string,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    infer TResponses
  >
    ? TResponses extends { 200: ResponseConfig<infer T200> }
      ? T200
      : TResponses extends { 201: ResponseConfig<infer T201> }
        ? T201
        : TResponses extends { 202: ResponseConfig<infer T202> }
          ? T202
          : TResponses extends { 204: ResponseConfig }
            ? void // eslint-disable-line @typescript-eslint/no-invalid-void-type -- void is semantically correct for 204 No Content
            : unknown
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
    ResponsesConfig
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
    ResponsesConfig
  >
    ? TPath
    : never;
