import type { HttpRequest } from '../../../../../../core/bounded-context/presentation/interfaces/types/http-request';
import { mapRequestBody } from './map-request-body';
import { mapRequestHeaders } from './map-request-headers';
import { mapRequestQueryParams } from './map-request-query-params';

/**
 * Maps a Cloudflare Workers Request to the standard HttpRequest format.
 *
 * Combines all individual mappers to create a complete HttpRequest object.
 * Note: pathParams are not extracted here - they are handled by the routing system.
 *
 * @param request - The incoming Request object
 * @returns The mapped HttpRequest
 *
 * @example
 * ```typescript
 * const httpRequest = await mapRequest(request);
 * // {
 * //   body: { name: 'John' },
 * //   headers: { 'content-type': 'application/json' },
 * //   pathParams: undefined,
 * //   queryParams: { limit: '10' },
 * // }
 * ```
 */
export async function mapRequest(request: Request): Promise<HttpRequest> {
  return {
    body: await mapRequestBody(request),
    headers: mapRequestHeaders(request),
    pathParams: undefined, // Extracted by routing system
    queryParams: mapRequestQueryParams(request),
  };
}
