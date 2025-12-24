/**
 * Maps an HttpResponse body to a string for the Response constructor.
 *
 * Handles undefined/null bodies and stringifies objects/arrays as JSON.
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
