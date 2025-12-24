import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { HttpResponse } from '../../../../../../core/bounded-context/presentation/interfaces/types/http-response';
import { mapResponseBody } from './map-response-body';
import { mapResponseHeaders } from './map-response-headers';

/**
 * Maps an HttpResponse to AWS API Gateway v2 result format.
 *
 * - Stringifies the body as JSON if present
 * - Adds Content-Type header for JSON responses
 * - Includes base CORS headers by default
 * - Merges custom headers from the response
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
 * ```
 */
export function mapResponse(
  response: HttpResponse,
  options: { includeBaseHeaders?: boolean } = {},
): APIGatewayProxyResultV2 {
  const { includeBaseHeaders = true } = options;
  const hasBody = response.body !== undefined && response.body !== null;

  return {
    statusCode: response.statusCode,
    body: mapResponseBody(response.body),
    headers: mapResponseHeaders(response.headers, { includeBaseHeaders, hasBody }),
  };
}
