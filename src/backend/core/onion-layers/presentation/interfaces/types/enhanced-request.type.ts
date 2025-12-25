/**
 * Enhanced request wrapper with metadata and context.
 *
 * Provides a generic structure for wrapping any request type with
 * additional metadata (e.g., trace ID, timestamp) and execution context
 * (e.g., authenticated user, permissions).
 *
 * This is a presentation-layer concern as it represents how external
 * systems (HTTP, Kafka, WebSocket, gRPC, CLI, etc.) interact with
 * our services.
 *
 * @typeParam TMetadata - Request metadata type (e.g., trace ID, correlation ID)
 * @typeParam TContext - Execution context type (e.g., auth user, API key, permissions)
 * @typeParam TRequest - The actual request payload type
 *
 * @example
 * ```typescript
 * interface RequestMetadata {
 *   traceId: string;
 *   timestamp: Date;
 * }
 *
 * interface UserContext {
 *   userId: string;
 *   roles: string[];
 * }
 *
 * type MyEnhancedRequest = EnhancedRequest<RequestMetadata, UserContext, HttpRequest>;
 *
 * const request: MyEnhancedRequest = {
 *   metadata: { traceId: 'abc-123', timestamp: new Date() },
 *   context: { userId: 'user-1', roles: ['admin'] },
 *   request: { body: { name: 'John' } },
 * };
 * ```
 */
export interface EnhancedRequest<TMetadata, TContext, TRequest> {
  /**
   * Request metadata containing operational information.
   * Typically includes trace IDs, timestamps, and other observability data.
   */
  metadata: TMetadata;

  /**
   * Execution context containing authorization and identity information.
   * Typically includes authenticated user data, permissions, and API key info.
   */
  context: TContext;

  /**
   * The actual request payload.
   * Contains the business-relevant data from the incoming request.
   */
  request: TRequest;
}
