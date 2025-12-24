/**
 * Basic HTTP request structure for any HTTP-based framework.
 *
 * This is the foundation type representing the data extracted from an HTTP request.
 * Frameworks (AWS API Gateway, Cloudflare Workers, Express, etc.) map their native
 * request types to this common interface.
 */
export interface HttpRequest {
  body?: unknown;
  headers?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
}
