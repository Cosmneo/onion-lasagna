import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { HttpResponse } from '../../../../../../core/onion-layers/presentation/interfaces/types/http';
import { isNoBodyStatus, mapResponseBody, mapResponseHeaders } from '../../../../core';

/**
 * Maps an HttpResponse to AWS API Gateway v2 result format.
 *
 * - Stringifies the body as JSON if present
 * - Adds Content-Type header for JSON responses
 * - Includes base CORS headers by default
 * - Merges custom headers from the response
 * - Omits body for status codes that forbid it (204, 304, 1xx) per RFC 9110
 *
 * @param response - The HttpResponse to convert
 * @param options - Optional configuration
 * @param options.includeBaseHeaders - Whether to include CORS headers (default: true)
 * @returns APIGatewayProxyResultV2 for AWS Lambda
 *
 * @example
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
 *
 * // 204 No Content - body is omitted
 * const noContentResponse = mapResponse({ statusCode: 204 });
 * // { statusCode: 204, headers: {...CORS} }
 * ```
 */
export function mapResponse(
  response: HttpResponse,
  options: { includeBaseHeaders?: boolean } = {},
): APIGatewayProxyResultV2 {
  const { includeBaseHeaders = true } = options;

  // RFC 9110: 1xx, 204, and 304 responses must not include a body
  if (isNoBodyStatus(response.statusCode)) {
    return {
      statusCode: response.statusCode,
      headers: mapResponseHeaders(response.headers, { includeBaseHeaders, hasBody: false }),
    };
  }

  const hasBody = response.body !== undefined && response.body !== null;

  return {
    statusCode: response.statusCode,
    body: mapResponseBody(response.body),
    headers: mapResponseHeaders(response.headers, { includeBaseHeaders, hasBody }),
  };
}
