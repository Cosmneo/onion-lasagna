/**
 * Maps headers from a Cloudflare Workers Request to a plain object.
 *
 * Converts the Headers object to a Record<string, string> for easier access.
 * Returns `undefined` if no headers exist, consistent with AWS runtime behavior.
 *
 * @param request - The incoming Request object
 * @returns A plain object containing all headers, or undefined if empty
 *
 * @example
 * ```typescript
 * const headers = mapRequestHeaders(request);
 * // { 'content-type': 'application/json', 'authorization': 'Bearer ...' }
 * // or undefined if no headers
 * ```
 */
export function mapRequestHeaders(request: Request): Record<string, string> | undefined {
  const headers: Record<string, string> = {};

  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return Object.keys(headers).length > 0 ? headers : undefined;
}
