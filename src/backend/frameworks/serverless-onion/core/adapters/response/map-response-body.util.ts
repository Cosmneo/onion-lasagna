/**
 * Maps an HttpResponse body to a string format suitable for all platforms.
 *
 * Handles:
 * - undefined/null bodies → empty string
 * - string bodies → returned as-is
 * - objects/arrays → JSON stringified
 *
 * @param body - The response body to convert
 * @returns The stringified body
 *
 * @example
 * ```typescript
 * mapResponseBody({ name: 'John' }) // '{"name":"John"}'
 * mapResponseBody('Hello')          // 'Hello'
 * mapResponseBody(undefined)        // ''
 * mapResponseBody(null)             // ''
 * ```
 */
export function mapResponseBody(body: unknown): string {
  if (body === undefined || body === null) {
    return '';
  }

  if (typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body);
}
