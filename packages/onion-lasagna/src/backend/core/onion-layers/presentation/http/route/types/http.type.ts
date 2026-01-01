/**
 * @fileoverview HTTP-related types for route definitions.
 *
 * @module unified/route/types/http
 */

/**
 * Supported HTTP methods for route definitions.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HTTP status codes commonly used in API responses.
 */
export type HttpStatusCode =
  // 2xx Success
  | 200 // OK
  | 201 // Created
  | 202 // Accepted
  | 204 // No Content
  // 3xx Redirection
  | 301 // Moved Permanently
  | 302 // Found
  | 304 // Not Modified
  | 307 // Temporary Redirect
  | 308 // Permanent Redirect
  // 4xx Client Errors
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 405 // Method Not Allowed
  | 409 // Conflict
  | 410 // Gone
  | 422 // Unprocessable Entity
  | 429 // Too Many Requests
  // 5xx Server Errors
  | 500 // Internal Server Error
  | 501 // Not Implemented
  | 502 // Bad Gateway
  | 503 // Service Unavailable
  | 504; // Gateway Timeout

/**
 * Content types for request/response bodies.
 */
export type ContentType =
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain'
  | 'text/html'
  | 'application/octet-stream'
  | (string & {});

/**
 * Default content type for API requests/responses.
 */
export const DEFAULT_CONTENT_TYPE: ContentType = 'application/json';
