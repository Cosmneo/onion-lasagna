/**
 * Maps the request body from a Cloudflare Workers Request.
 *
 * Attempts to parse JSON if the content-type is application/json,
 * otherwise returns the raw text. Returns undefined for empty bodies.
 *
 * @param request - The incoming Request object
 * @returns The parsed body or undefined
 *
 * @example
 * ```typescript
 * const body = await mapRequestBody(request);
 * // For JSON: { name: 'John', age: 30 }
 * // For text: 'Hello World'
 * // For empty: undefined
 * ```
 */
export async function mapRequestBody(request: Request): Promise<unknown> {
  // Check if there's a body to read
  if (!request.body) {
    return undefined;
  }

  // Clone the request to avoid consuming the body
  const clonedRequest = request.clone();

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await clonedRequest.json();
    } catch {
      // If JSON parsing fails, return as text
      return await request.clone().text();
    }
  }

  // For non-JSON content, return as text
  const text = await clonedRequest.text();
  return text.length > 0 ? text : undefined;
}
