/**
 * Basic HTTP response structure for any HTTP-based framework.
 *
 * This is the foundation type representing the data to send as an HTTP response.
 * Frameworks (AWS API Gateway, Cloudflare Workers, Express, etc.) map this common
 * interface to their native response types.
 */
export interface HttpResponse {
  statusCode: number;
  headers?: Record<string, unknown>;
  body?: unknown;
}
