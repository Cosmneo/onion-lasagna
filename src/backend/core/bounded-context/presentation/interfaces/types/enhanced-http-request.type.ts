import type { EnhancedRequest } from './enhanced-request.type';
import type { HttpRequest } from './http-request';

/**
 * Enhanced HTTP request with metadata and context.
 *
 * A specialized version of {@link EnhancedRequest} where the request payload
 * is fixed to {@link HttpRequest}. This is the standard type for HTTP-based
 * frameworks (AWS API Gateway, Cloudflare Workers, Express, etc.).
 *
 * @typeParam TMetadata - Request metadata type (e.g., request ID, correlation ID)
 * @typeParam TContext - Execution context type (e.g., authenticated user, API key)
 *
 * @example AWS API Gateway usage
 * ```typescript
 * interface AwsMetadata {
 *   requestId: string;
 *   stage: string;
 * }
 *
 * interface AuthorizerContext {
 *   userId: string;
 *   permissions: string[];
 * }
 *
 * type AwsEnhancedRequest = EnhancedHttpRequest<AwsMetadata, AuthorizerContext>;
 *
 * const request: AwsEnhancedRequest = {
 *   metadata: { requestId: 'req-123', stage: 'prod' },
 *   context: { userId: 'user-1', permissions: ['read', 'write'] },
 *   request: {
 *     body: { name: 'John' },
 *     headers: { 'content-type': 'application/json' },
 *     pathParams: { id: '123' },
 *     queryParams: { limit: '10' },
 *   },
 * };
 * ```
 */
export type EnhancedHttpRequest<TMetadata, TContext> = EnhancedRequest<
  TMetadata,
  TContext,
  HttpRequest
>;
