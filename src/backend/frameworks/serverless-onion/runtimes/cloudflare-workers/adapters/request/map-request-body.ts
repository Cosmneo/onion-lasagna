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

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    // Clone the request to read body as text first (can only read once)
    const clonedRequest = request.clone();
    const text = await clonedRequest.text();

    if (text.length === 0) {
      return undefined;
    }

    try {
      return JSON.parse(text);
    } catch {
      // If JSON parsing fails, return raw text
      return text;
    }
  }

  // For non-JSON content, return as text
  const text = await request.clone().text();
  return text.length > 0 ? text : undefined;
}
