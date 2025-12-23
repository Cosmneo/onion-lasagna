/**
 * Maps query parameters from a Cloudflare Workers Request.
 *
 * Extracts query string parameters from the URL and returns them
 * as a plain object. Returns undefined if no parameters exist.
 *
 * @param request - The incoming Request object
 * @returns Query parameters as a Record, or undefined if none
 *
 * @example
 * ```typescript
 * // For URL: /users?page=1&limit=10
 * const params = mapRequestQueryParams(request);
 * // { page: '1', limit: '10' }
 *
 * // For URL: /users
 * const params = mapRequestQueryParams(request);
 * // undefined
 * ```
 */
export function mapRequestQueryParams(request: Request): Record<string, string> | undefined {
  const url = new URL(request.url);

  if (url.searchParams.size === 0) {
    return undefined;
  }

  const params: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}
