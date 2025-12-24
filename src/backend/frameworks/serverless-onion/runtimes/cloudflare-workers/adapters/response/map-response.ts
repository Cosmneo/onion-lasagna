import type { HttpResponse } from '../../../../../../core/bounded-context/presentation/interfaces/types/http-response';
import { mapResponseBody } from './map-response-body';
import { mapResponseHeaders } from './map-response-headers';

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
 * ```
 */
export function mapResponse(response: HttpResponse, options: MapResponseOptions = {}): Response {
  const { includeBaseHeaders = true } = options;

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
