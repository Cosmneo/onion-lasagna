import type { HttpResponse } from '../../../../../../core/onion-layers/presentation/interfaces/types/http';
import {
  isNoBodyStatus,
  mapResponseBody,
  mapResponseHeaders,
  type CorsConfig,
} from '../../../../core';

/**
 * Options for mapping responses.
 */
export interface MapResponseOptions {
  /**
   * CORS configuration.
   *
   * - `CorsConfig` - Apply custom CORS configuration
   * - `false` - Disable CORS headers entirely
   * - `undefined` - Use default permissive CORS
   *
   * @default undefined (uses default CORS)
   */
  cors?: CorsConfig | false;

  /**
   * The Origin header from the incoming request.
   * Used for dynamic origin matching with CORS.
   */
  requestOrigin?: string;
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
 * @param options - Mapping options (CORS config, request origin)
 * @returns A Cloudflare Workers Response
 *
 * @example Default CORS
 * ```typescript
 * const response = mapResponse({
 *   statusCode: 200,
 *   body: { id: 1, name: 'John' },
 *   headers: { 'X-Custom': 'value' },
 * });
 * // Response with status 200, JSON body, CORS headers, and custom header
 * ```
 *
 * @example Custom CORS
 * ```typescript
 * const response = mapResponse(
 *   { statusCode: 200, body: { ok: true } },
 *   { cors: { origin: 'https://myapp.com', credentials: true } }
 * );
 * ```
 *
 * @example No CORS
 * ```typescript
 * const response = mapResponse({ statusCode: 200, body: { ok: true } }, { cors: false });
 * ```
 */
export function mapResponse(response: HttpResponse, options: MapResponseOptions = {}): Response {
  const { cors, requestOrigin } = options;

  // RFC 9110: 1xx, 204, and 304 responses must not include a body
  if (isNoBodyStatus(response.statusCode)) {
    const headers = mapResponseHeaders(response.headers, {
      cors,
      requestOrigin,
      hasBody: false,
    });

    return new Response(null, {
      status: response.statusCode,
      headers,
    });
  }

  const body = mapResponseBody(response.body);
  const headers = mapResponseHeaders(response.headers, {
    cors,
    requestOrigin,
    hasBody: body !== '',
  });

  return new Response(body, {
    status: response.statusCode,
    headers,
  });
}
