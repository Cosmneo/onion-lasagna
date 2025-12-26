/**
 * Basic HTTP response structure for any HTTP-based framework.
 *
 * This is the foundation type representing the data to send as an HTTP response.
 * Frameworks (AWS API Gateway, Cloudflare Workers, Express, etc.) map this common
 * interface to their native response types.
 *
 * @example Success response
 * ```typescript
 * const response: HttpResponse = {
 *   statusCode: 200,
 *   body: { id: '123', name: 'John' },
 * };
 * ```
 *
 * @example Response with headers
 * ```typescript
 * const response: HttpResponse = {
 *   statusCode: 201,
 *   headers: {
 *     'Location': '/users/123',
 *     'X-Request-Id': 'req-abc',
 *   },
 *   body: { id: '123' },
 * };
 * ```
 */
export interface HttpResponse {
  /**
   * HTTP status code (e.g., 200, 201, 400, 404, 500).
   */
  statusCode: number;

  /**
   * Optional response headers.
   * Common headers include Content-Type, Location, Cache-Control, etc.
   */
  headers?: Record<string, unknown>;

  /**
   * Optional response body.
   * Will be serialized to JSON by framework adapters if it's an object.
   */
  body?: unknown;
}
