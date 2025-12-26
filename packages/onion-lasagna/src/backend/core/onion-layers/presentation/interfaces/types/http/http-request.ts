/**
 * Basic HTTP request structure for any HTTP-based framework.
 *
 * This is the foundation type representing the data extracted from an HTTP request.
 * Frameworks (AWS API Gateway, Cloudflare Workers, Express, etc.) map their native
 * request types to this common interface.
 *
 * @example Complete request
 * ```typescript
 * const request: HttpRequest = {
 *   body: { name: 'John', email: 'john@example.com' },
 *   headers: { 'content-type': 'application/json', 'authorization': 'Bearer ...' },
 *   pathParams: { id: '123' },
 *   queryParams: { include: 'profile' },
 * };
 * ```
 */
export interface HttpRequest {
  /**
   * Parsed request body.
   * For JSON requests, this is the deserialized object.
   * For form data, this contains the parsed form fields.
   */
  body?: unknown;

  /**
   * HTTP request headers (normalized to lowercase keys).
   * Common headers include authorization, content-type, accept, etc.
   */
  headers?: Record<string, string>;

  /**
   * Query string parameters from the URL.
   * For `/users?page=1&limit=10`, this would be `{ page: '1', limit: '10' }`.
   * When a key appears multiple times (e.g., `?tag=a&tag=b`), the value is an array.
   */
  queryParams?: Record<string, string | string[]>;

  /**
   * Path parameters extracted from the URL pattern.
   * For route `/users/:id` and URL `/users/123`, this would be `{ id: '123' }`.
   */
  pathParams?: Record<string, string>;
}
