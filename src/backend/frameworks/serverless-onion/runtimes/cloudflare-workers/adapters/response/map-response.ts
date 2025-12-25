import type { HttpResponse } from '../../../../../../core/onion-layers/presentation/interfaces/types/http';
import { isNoBodyStatus, mapResponseBody, mapResponseHeaders } from '../../../../core';

/**
 * Options for mapping responses.
 */
export interface MapResponseOptions {
  /**
   * Whether to include CORS base headers.
   * @default true
   */
  includeBaseHeaders?: boolean;
}

/**
 * Maps an HttpResponse to a Cloudflare Workers Response.
 *
 * Converts the framework's HttpResponse format to the standard
 * Web API Response object used by Cloudflare Workers.
 *
 * Per RFC 9110, responses with status codes 1xx, 204, and 304
 * are created without a body.
 *
 * @param response - The HttpResponse to convert
 * @param options - Mapping options
 * @returns A Cloudflare Workers Response
 *
 * @example
 * ```typescript
 * const response = mapResponse({
 *   statusCode: 200,
 *   body: { id: 1, name: 'John' },
 *   headers: { 'X-Custom': 'value' },
 * });
 * // Response with status 200, JSON body, CORS headers, and custom header
 *
 * // 204 No Content - no body
 * const noContentResponse = mapResponse({ statusCode: 204 });
 * // Response with status 204, no body, CORS headers
 * ```
 */
export function mapResponse(response: HttpResponse, options: MapResponseOptions = {}): Response {
  const { includeBaseHeaders = true } = options;

  // RFC 9110: 1xx, 204, and 304 responses must not include a body
  if (isNoBodyStatus(response.statusCode)) {
    const headers = mapResponseHeaders(response.headers, {
      includeBaseHeaders,
      hasBody: false,
    });

    return new Response(null, {
      status: response.statusCode,
      headers,
    });
  }

  const body = mapResponseBody(response.body);
  const headers = mapResponseHeaders(response.headers, {
    includeBaseHeaders,
    hasBody: body !== '',
  });

  return new Response(body, {
    status: response.statusCode,
    headers,
  });
}
