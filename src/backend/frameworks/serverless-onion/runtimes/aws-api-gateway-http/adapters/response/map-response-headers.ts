import { BASE_HEADERS } from '../../../../core';

/**
 * Options for mapping response headers.
 */
export interface MapResponseHeadersOptions {
  /**
   * Whether to include base CORS headers.
   * @default true
   */
  includeBaseHeaders?: boolean;

  /**
   * Whether the response has a body (adds Content-Type header).
   * @default false
   */
  hasBody?: boolean;
}

/**
 * Maps HttpResponse headers to AWS API Gateway v2 headers format.
 *
 * - Includes base CORS headers by default
 * - Adds Content-Type header for responses with body
 * - Merges custom headers from the response
 *
 * @param headers - Custom headers from the HttpResponse
 * @param options - Configuration options
 * @returns Merged headers object
 */
export function mapResponseHeaders(
  headers: Record<string, unknown> | undefined,
  options: MapResponseHeadersOptions = {},
): Record<string, string | number | boolean> {
  const { includeBaseHeaders = true, hasBody = false } = options;

  return {
    ...(includeBaseHeaders && BASE_HEADERS),
    ...(hasBody && { 'Content-Type': 'application/json' }),
    ...((headers ?? {}) as Record<string, string | number | boolean>),
  };
}
