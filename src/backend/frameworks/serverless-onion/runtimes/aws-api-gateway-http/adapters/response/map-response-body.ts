/**
 * Maps an HttpResponse body to AWS API Gateway v2 string format.
 *
 * - Returns empty string if body is undefined or null
 * - Stringifies objects/arrays as JSON
 *
 * @param body - The response body to convert
 * @returns JSON stringified body or empty string
 */
export function mapResponseBody(body: unknown): string {
  if (body === undefined || body === null) {
    return '';
  }

  return JSON.stringify(body);
}
