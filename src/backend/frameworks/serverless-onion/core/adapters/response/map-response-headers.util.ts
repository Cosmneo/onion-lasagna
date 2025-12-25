import type { CorsConfig } from '../../types';
import { buildCorsHeaders } from '../../utils';

/**
 * Options for mapping response headers.
 */
export interface MapResponseHeadersOptions {
  /**
   * CORS configuration.
   *
   * - `CorsConfig` - Apply custom CORS configuration
   * - `false` - Disable CORS headers entirely
   * - `undefined` - Use default permissive CORS (same as old BASE_HEADERS)
   *
   * @default undefined (uses default CORS)
   */
  cors?: CorsConfig | false;

  /**
   * The Origin header from the incoming request.
   * Used for dynamic origin matching when cors.origin is an array
   * or when credentials are enabled with '*' origin.
   */
  requestOrigin?: string;

  /**
   * Whether the response has a body (adds Content-Type if true).
   * @default false
   */
  hasBody?: boolean;
}

/**
 * Maps response headers, merging CORS headers with custom headers.
 *
 * - Applies CORS headers based on configuration (or defaults)
 * - Adds Content-Type header for responses with body
 * - Converts all values to strings for cross-platform compatibility
 * - Filters out undefined/null header values
 *
 * @param headers - Custom headers to include
 * @param options - Mapping options
 * @returns Merged headers object with all string values
 *
 * @example Default CORS (permissive)
 * ```typescript
 * mapResponseHeaders({ 'X-Custom': 'value' }, { hasBody: true })
 * // {
 * //   'Content-Type': 'application/json',
 * //   'Access-Control-Allow-Origin': '*',
 * //   ...other CORS headers,
 * //   'X-Custom': 'value'
 * // }
 * ```
 *
 * @example Custom CORS
 * ```typescript
 * mapResponseHeaders(
 *   { 'X-Custom': 'value' },
 *   {
 *     cors: { origin: 'https://myapp.com', credentials: true },
 *     hasBody: true,
 *   }
 * )
 * // {
 * //   'Content-Type': 'application/json',
 * //   'Access-Control-Allow-Origin': 'https://myapp.com',
 * //   'Access-Control-Allow-Credentials': 'true',
 * //   ...
 * // }
 * ```
 *
 * @example No CORS
 * ```typescript
 * mapResponseHeaders({ 'X-Custom': 'value' }, { cors: false, hasBody: true })
 * // { 'Content-Type': 'application/json', 'X-Custom': 'value' }
 * ```
 */
export function mapResponseHeaders(
  headers: Record<string, unknown> | undefined,
  options: MapResponseHeadersOptions = {},
): Record<string, string> {
  const { cors, requestOrigin, hasBody = false } = options;

  const result: Record<string, string> = {};

  // Add CORS headers unless explicitly disabled
  if (cors !== false) {
    const corsConfig = cors ?? {}; // undefined = use defaults
    const corsHeaders = buildCorsHeaders(corsConfig, requestOrigin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      result[key] = value;
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
