import type { PlatformProxyAdapter } from './types';

/**
 * HTTP request components extracted from a platform request.
 *
 * This is the framework's internal representation of an HTTP request,
 * independent of any specific platform's request format.
 */
export interface HttpRequestComponents {
  /**
   * The parsed request body, or undefined if no body is present.
   */
  body: unknown;

  /**
   * Request headers as a flat key-value map.
   */
  headers: Record<string, string>;

  /**
   * Query string parameters.
   * Values may be arrays for repeated parameters.
   */
  queryParams: Record<string, string | string[]>;

  /**
   * Path parameters extracted from the route pattern.
   * For example, `/users/{id}` with path `/users/123` yields `{ id: '123' }`.
   */
  pathParams: Record<string, string>;
}

/**
 * Builds an HttpRequestComponents object from a platform request using the adapter.
 *
 * This is a convenience function that extracts all request components using
 * the adapter's extraction methods and combines them with the resolved path parameters.
 *
 * @typeParam TPlatformRequest - The platform's native request type
 *
 * @param adapter - The platform proxy adapter with extraction methods
 * @param request - The platform-specific request object
 * @param pathParams - Path parameters extracted from the routing system
 *
 * @returns A Promise resolving to HttpRequestComponents
 *
 * @example
 * ```typescript
 * const httpRequest = await buildHttpRequest(
 *   awsProxyAdapter,
 *   event,
 *   { id: '123' },
 * );
 * // { body: {...}, headers: {...}, queryParams: {...}, pathParams: { id: '123' } }
 * ```
 */
export async function buildHttpRequest<TPlatformRequest>(
  adapter: PlatformProxyAdapter<TPlatformRequest, unknown>,
  request: TPlatformRequest,
  pathParams: Record<string, string>,
): Promise<HttpRequestComponents> {
  return {
    body: await adapter.extractBody(request),
    headers: adapter.extractHeaders(request),
    queryParams: adapter.extractQueryParams(request),
    pathParams,
  };
}
