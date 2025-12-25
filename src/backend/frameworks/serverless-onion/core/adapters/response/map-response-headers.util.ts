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
 * - Includes CORS base headers by default
 * - Adds Content-Type header for responses with body
 * - Converts all values to strings for cross-platform compatibility
 * - Filters out undefined/null header values
 *
 * @param headers - Custom headers to include
 * @param options - Mapping options
 * @returns Merged headers object with all string values
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
    for (const [key, value] of Object.entries(BASE_HEADERS)) {
      result[key] = String(value);
    }
  }

  // Add Content-Type if body is present
  if (hasBody) {
    result['Content-Type'] = 'application/json';
  }

  // Merge custom headers, converting values to strings
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
  }

  return result;
}
