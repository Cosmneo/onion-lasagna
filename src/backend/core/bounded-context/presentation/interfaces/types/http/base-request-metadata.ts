/**
 * Base request metadata common to all HTTP-based frameworks.
 *
 * This interface defines the minimal metadata fields that every HTTP request
 * should have, regardless of the underlying platform (AWS, Cloudflare, Express, etc.).
 *
 * Platform-specific metadata types should extend this interface to add their
 * own fields (e.g., `requestId`, `sourceIp` for AWS, `url` for Cloudflare).
 *
 * @example
 * ```typescript
 * // AWS API Gateway metadata
 * interface AwsRequestMetadata extends BaseRequestMetadata {
 *   requestId: string;
 *   sourceIp: string;
 *   userAgent: string;
 * }
 *
 * // Cloudflare Workers metadata
 * interface CloudflareRequestMetadata extends BaseRequestMetadata {
 *   url: string;
 * }
 * ```
 */
export interface BaseRequestMetadata {
  /**
   * The request path (e.g., `/users/123`).
   */
  path: string;

  /**
   * The HTTP method (e.g., `GET`, `POST`, `PUT`, `DELETE`).
   */
  method: string;
}
