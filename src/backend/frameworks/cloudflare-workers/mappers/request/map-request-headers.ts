/**
 * Maps headers from a Cloudflare Workers Request to a plain object.
 *
 * Converts the Headers object to a Record<string, string> for easier access.
 *
 * @param request - The incoming Request object
 * @returns A plain object containing all headers
 *
 * @example
 * ```typescript
 * const headers = mapRequestHeaders(request);
 * // { 'content-type': 'application/json', 'authorization': 'Bearer ...' }
 * ```
 */
export function mapRequestHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};

  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return headers;
}
