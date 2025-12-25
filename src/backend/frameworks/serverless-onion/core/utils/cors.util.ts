import type { CorsConfig } from '../types';
import {
  DEFAULT_CORS_ALLOW_HEADERS,
  DEFAULT_CORS_MAX_AGE,
  DEFAULT_CORS_METHODS,
} from '../types/config.type';

/**
 * Builds CORS headers from a CorsConfig object.
 *
 * @param config - CORS configuration
 * @param requestOrigin - The Origin header from the incoming request (used for origin matching)
 * @returns CORS headers as a Record
 *
 * @example
 * ```typescript
 * const headers = buildCorsHeaders({ origin: 'https://app.com', credentials: true });
 * // {
 * //   'Access-Control-Allow-Origin': 'https://app.com',
 * //   'Access-Control-Allow-Credentials': 'true',
 * //   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
 * //   'Access-Control-Allow-Headers': 'Content-Type, Authorization',
 * //   'Access-Control-Max-Age': '86400',
 * // }
 * ```
 */
export function buildCorsHeaders(
  config: CorsConfig,
  requestOrigin?: string,
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Determine origin
  const origin = resolveOrigin(config.origin, config.credentials, requestOrigin);
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  // Add Vary: Origin if using dynamic origin matching
  if (Array.isArray(config.origin) || (config.credentials && config.origin === '*')) {
    headers['Vary'] = 'Origin';
  }

  // Methods
  const methods = config.methods ?? [...DEFAULT_CORS_METHODS];
  headers['Access-Control-Allow-Methods'] = methods.join(', ');

  // Allowed headers
  const allowHeaders = config.allowHeaders ?? [...DEFAULT_CORS_ALLOW_HEADERS];
  headers['Access-Control-Allow-Headers'] = allowHeaders.join(', ');

  // Exposed headers
  if (config.exposeHeaders && config.exposeHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = config.exposeHeaders.join(', ');
  }

  // Credentials
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Max age
  const maxAge = config.maxAge ?? DEFAULT_CORS_MAX_AGE;
  headers['Access-Control-Max-Age'] = String(maxAge);

  return headers;
}

/**
 * Resolves the Access-Control-Allow-Origin header value.
 *
 * @param configOrigin - Origin from config
 * @param credentials - Whether credentials are enabled
 * @param requestOrigin - The Origin header from the request
 * @returns The resolved origin value
 */
function resolveOrigin(
  configOrigin: CorsConfig['origin'],
  credentials: boolean | undefined,
  requestOrigin: string | undefined,
): string {
  // Handle array of allowed origins
  if (Array.isArray(configOrigin)) {
    if (requestOrigin && configOrigin.includes(requestOrigin)) {
      return requestOrigin;
    }
    // If request origin doesn't match, return first allowed origin
    // (This is a fallback; in practice, you might want to return nothing)
    return configOrigin[0] ?? '*';
  }

  // Handle '*' with credentials - must use actual origin
  if (configOrigin === '*' && credentials && requestOrigin) {
    return requestOrigin;
  }

  // Return configured origin or default to '*'
  return configOrigin ?? '*';
}

/**
 * Returns the default CORS headers (permissive configuration).
 *
 * @returns Default CORS headers matching the old BASE_HEADERS behavior
 */
export function getDefaultCorsHeaders(): Record<string, string> {
  return buildCorsHeaders({});
}
