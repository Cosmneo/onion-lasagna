import type { APIGatewayProxyResultV2 } from 'aws-lambda';
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
 * Maps an HttpResponse to AWS API Gateway v2 result format.
 *
 * - Stringifies the body as JSON if present
 * - Adds Content-Type header for JSON responses
 * - Includes CORS headers based on configuration
 * - Merges custom headers from the response
 * - Omits body for status codes that forbid it (204, 304, 1xx) per RFC 9110
 *
 * @param response - The HttpResponse to convert
 * @param options - Mapping options (CORS config, request origin)
 * @returns APIGatewayProxyResultV2 for AWS Lambda
 *
 * @example Default CORS
 * ```typescript
 * const awsResponse = mapResponse({
 *   statusCode: 200,
 *   body: { id: 1, name: 'John' },
 *   headers: { 'X-Custom': 'value' },
 * });
 * // {
 * //   statusCode: 200,
 * //   body: '{"id":1,"name":"John"}',
 * //   headers: { 'Content-Type': 'application/json', 'X-Custom': 'value', ...CORS }
 * // }
 * ```
 *
 * @example Custom CORS
 * ```typescript
 * const awsResponse = mapResponse(
 *   { statusCode: 200, body: { ok: true } },
 *   { cors: { origin: 'https://myapp.com', credentials: true } }
 * );
 * ```
 *
 * @example No CORS
 * ```typescript
 * const awsResponse = mapResponse({ statusCode: 200, body: { ok: true } }, { cors: false });
 * ```
 */
export function mapResponse(
  response: HttpResponse,
  options: MapResponseOptions = {},
): APIGatewayProxyResultV2 {
  const { cors, requestOrigin } = options;

  // RFC 9110: 1xx, 204, and 304 responses must not include a body
  if (isNoBodyStatus(response.statusCode)) {
    return {
      statusCode: response.statusCode,
      headers: mapResponseHeaders(response.headers, { cors, requestOrigin, hasBody: false }),
    };
  }

  const hasBody = response.body !== undefined && response.body !== null;

  return {
    statusCode: response.statusCode,
    body: mapResponseBody(response.body),
    headers: mapResponseHeaders(response.headers, { cors, requestOrigin, hasBody }),
  };
}
