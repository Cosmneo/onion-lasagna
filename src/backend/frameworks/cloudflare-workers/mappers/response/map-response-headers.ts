import { BASE_HEADERS } from '../../constants';

/**
 * Options for mapping response headers.
 */
export interface MapResponseHeadersOptions {
  /**
   * Whether to include CORS base headers.
   * @default true
   */
  includeBaseHeaders?: boolean;

  /**
   * Whether the response has a body (adds Content-Type if true).
   * @default false
   */
  hasBody?: boolean;
}

/**
 * Maps response headers, merging base headers with custom headers.
 *
 * @param headers - Custom headers to include
 * @param options - Mapping options
 * @returns Merged headers object
 *
 * @example
 * ```typescript
 * mapResponseHeaders({ 'X-Custom': 'value' }, { hasBody: true })
 * // {
 * //   'Content-Type': 'application/json',
 * //   'Access-Control-Allow-Origin': '*',
 * //   ...other CORS headers,
 * //   'X-Custom': 'value'
 * // }
 * ```
 */
export function mapResponseHeaders(
  headers: Record<string, unknown> | undefined,
  options: MapResponseHeadersOptions = {},
): Record<string, string> {
  const { includeBaseHeaders = true, hasBody = false } = options;

  const result: Record<string, string> = {};

  // Add base headers if enabled
  if (includeBaseHeaders) {
    Object.assign(result, BASE_HEADERS);
  }

  // Add Content-Type if body is present
  if (hasBody) {
    result['Content-Type'] = 'application/json';
  }

  // Merge custom headers
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
  }

  return result;
}
