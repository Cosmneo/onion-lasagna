/**
 * Base headers for HTTP responses in serverless applications.
 * Includes CORS configuration suitable for most API scenarios.
 */
export const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
} as const;

/**
 * Type for base headers object.
 */
export type BaseHeaders = typeof BASE_HEADERS;
