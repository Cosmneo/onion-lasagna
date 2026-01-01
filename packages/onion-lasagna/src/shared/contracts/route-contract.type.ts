/**
 * @fileoverview Core RouteContract type - the single source of truth for route definitions.
 *
 * A RouteContract captures path, method, and request/response type shapes.
 * Used by both client (for type inference) and server (for route registration).
 *
 * @module route-contract
 */

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HTTP methods supported by route contracts.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * HTTP methods that typically include a request body.
 */
export type BodyMethod = 'POST' | 'PUT' | 'PATCH';

/**
 * HTTP methods that typically do not include a request body.
 */
export type NoBodyMethod = 'GET' | 'DELETE';

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE SHAPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base shape for request data interfaces.
 * Matches the existing *RequestData interface pattern used in DTOs.
 *
 * @example
 * ```typescript
 * interface CreateProjectRequestData {
 *   body: { name: string; description?: string; };
 * }
 *
 * interface GetProjectRequestData {
 *   pathParams: { projectId: string; };
 * }
 *
 * interface ListProjectsRequestData {
 *   queryParams: { page?: string; pageSize?: string; };
 * }
 * ```
 */
export interface RequestDataShape {
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string | undefined>;
  body?: unknown;
}

/**
 * Empty request data for routes that don't require any input.
 */
export type EmptyRequestData = Record<string, never>;

/**
 * Base shape for response data interfaces.
 * Matches the existing *ResponseData interface pattern used in DTOs.
 *
 * @example
 * ```typescript
 * interface CreateProjectResponseData extends HttpResponse {
 *   body: { projectId: string; };
 * }
 * ```
 */
export interface ResponseDataShape {
  statusCode: number;
  body: unknown;
}

/**
 * Extract just the body type from a response data interface.
 * The client returns only the body, not statusCode.
 */
export type ExtractResponseBody<T extends ResponseDataShape> = T['body'];

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A route contract that captures the static route information.
 * This is the **single source of truth** for path, method, and type shapes.
 *
 * Used by:
 * - **Client**: for type inference when creating typed HTTP clients
 * - **Server**: as base for RouteInput (adds controller + request factory)
 *
 * @typeParam TPath - The route path (e.g., '/api/v1/projects/{projectId}')
 * @typeParam TMethod - The HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @typeParam TRequest - The request data interface (e.g., CreateProjectRequestData)
 * @typeParam TResponse - The response data interface (e.g., CreateProjectResponseData)
 *
 * @example
 * ```typescript
 * const createProjectContract: RouteContract<
 *   '/api/projects/',
 *   'POST',
 *   CreateProjectRequestData,
 *   CreateProjectResponseData
 * > = {
 *   path: '/api/projects/',
 *   method: 'POST',
 *   _types: {
 *     request: {} as CreateProjectRequestData,
 *     response: {} as CreateProjectResponseData,
 *   },
 * };
 * ```
 */
export interface RouteContract<
  TPath extends string = string,
  TMethod extends HttpMethod = HttpMethod,
  TRequest extends RequestDataShape = RequestDataShape,
  TResponse extends ResponseDataShape = ResponseDataShape,
> {
  /** The full route path (e.g., '/api/projects/{projectId}'). */
  readonly path: TPath;

  /** The HTTP method for this route. */
  readonly method: TMethod;

  /**
   * Phantom types for compile-time inference.
   * Not used at runtime - only exists for TypeScript type inference.
   * @internal
   */
  readonly _types: {
    readonly request: TRequest;
    readonly response: TResponse;
  };
}

/**
 * Type guard to check if a value is a RouteContract.
 */
export function isRouteContract(value: unknown): value is RouteContract {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    'method' in value &&
    '_types' in value
  );
}
