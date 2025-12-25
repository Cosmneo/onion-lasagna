/**
 * Base headers for HTTP responses in serverless applications.
 * Includes CORS configuration suitable for public APIs.
 *
 * **CORS Note:** `Access-Control-Allow-Credentials` is intentionally omitted
 * because it cannot be used with `Access-Control-Allow-Origin: '*'`.
 * For APIs that require credentials (cookies, authorization headers),
 * you must configure a specific origin instead of '*'.
 *
 * @example Credentialed CORS (override in your handler)
 * ```typescript
 * const headers = {
 *   ...BASE_HEADERS,
 *   'Access-Control-Allow-Origin': 'https://your-app.com',
 *   'Access-Control-Allow-Credentials': 'true',
 * };
 * ```
 */
export const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
} as const;

/**
 * Type for base headers object.
 */
export type BaseHeaders = typeof BASE_HEADERS;
