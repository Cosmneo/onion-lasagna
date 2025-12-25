/**
 * HTTP status codes that must not include a response body per RFC 9110.
 *
 * @see https://httpwg.org/specs/rfc9110.html#status.204
 * @see https://httpwg.org/specs/rfc9110.html#status.304
 */

/**
 * Checks if an HTTP status code forbids a response body.
 *
 * Per RFC 9110, the following responses must not contain a message body:
 * - 1xx (Informational): Interim responses, no body allowed
 * - 204 (No Content): Successful but intentionally no body
 * - 304 (Not Modified): Cache validation, body would be redundant
 *
 * @param statusCode - The HTTP status code to check
 * @returns True if the status code forbids a response body
 *
 * @example
 * ```typescript
 * isNoBodyStatus(200); // false - body allowed
 * isNoBodyStatus(201); // false - body allowed
 * isNoBodyStatus(204); // true - no body allowed
 * isNoBodyStatus(304); // true - no body allowed
 * isNoBodyStatus(100); // true - informational, no body
 * ```
 */
export function isNoBodyStatus(statusCode: number): boolean {
  return statusCode === 204 || statusCode === 304 || (statusCode >= 100 && statusCode < 200);
}
