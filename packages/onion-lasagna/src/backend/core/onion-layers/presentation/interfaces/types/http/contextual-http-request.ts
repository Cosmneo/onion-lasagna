import type { HttpRequest } from './http-request';

/**
 * HTTP request with execution context from middleware.
 *
 * Extends {@link HttpRequest} with a required `context` field that carries
 * data computed by middleware (authenticated user, request ID, permissions, etc.).
 *
 * Use this type when defining routes that require execution context:
 * - `RouteInput<ContextualHttpRequest<AuthContext>>` for protected routes
 * - `RouteInput<HttpRequest>` for public routes without context
 *
 * The `context` is injected by framework adapters when a `contextExtractor` is provided
 * in the route registration options.
 *
 * @typeParam TContext - The shape of the execution context (e.g., { user: User; requestId: string })
 *
 * @example Protected route with auth context
 * ```typescript
 * interface AuthContext {
 *   user: { id: string; email: string };
 *   requestId: string;
 * }
 *
 * const route: RouteInput<ContextualHttpRequest<AuthContext>> = {
 *   metadata: { path: '/users', method: 'POST' },
 *   controller: createUserController,
 *   requestDtoFactory: (req) => new CreateUserRequestDto({
 *     body: req.body,
 *     createdBy: req.context.user.id, // Type-safe access
 *   }, validator),
 * };
 * ```
 *
 * @example Registration with context extractor (Hono)
 * ```typescript
 * registerHonoRoutes(app, protectedRoutes, {
 *   middlewares: [authMiddleware],
 *   contextExtractor: (c): AuthContext => ({
 *     user: c.get('user'),
 *     requestId: c.get('requestId'),
 *   }),
 * });
 * ```
 */
export interface ContextualHttpRequest<TContext> extends HttpRequest {
  /**
   * Execution context computed by middleware.
   *
   * This is populated by the framework adapter using the `contextExtractor` function
   * provided during route registration. The context typically contains:
   * - Authenticated user information
   * - Request correlation/trace IDs
   * - Tenant information for multi-tenant apps
   * - Permissions or roles
   * - IP address or geolocation data
   *
   * Unlike optional fields in {@link HttpRequest}, this field is **required**
   * when using `ContextualHttpRequest`, ensuring type safety in request factories.
   */
  context: TContext;
}
