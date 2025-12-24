/**
 * A middleware function that processes a request and produces context.
 *
 * Middlewares are executed sequentially before the handler. Each middleware
 * receives the accumulated context from all previous middlewares and can
 * add its own context properties.
 *
 * To abort a request, throw an exception (e.g., `UnauthorizedException`).
 * Exceptions are caught by the global exception handler and converted to
 * HTTP responses.
 *
 * @typeParam TOutput - The context type this middleware produces
 * @typeParam TRequiredContext - Context required from previous middlewares (defaults to empty object)
 * @typeParam TEnv - Environment bindings (platform-specific, defaults to unknown)
 * @typeParam TRequest - Request type (defaults to Web API Request)
 *
 * @example
 * ```typescript
 * // Auth middleware - no dependencies
 * const authMiddleware: Middleware<AuthContext, object, Env> = async (request, env, ctx) => {
 *   const token = request.headers.get('authorization');
 *   if (!token) throw new UnauthorizedException({ message: 'Missing token', code: 'NO_TOKEN' });
 *   return { userId: '123', roles: ['user'] };
 * };
 *
 * // Tenant middleware - depends on AuthContext
 * const tenantMiddleware: Middleware<TenantContext, AuthContext, Env> = async (request, env, ctx) => {
 *   const tenant = await getTenant(ctx.userId); // ctx.userId is typed!
 *   return { tenantId: tenant.id };
 * };
 * ```
 */
export type Middleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv = unknown,
  TRequest = Request,
> = (request: TRequest, env: TEnv, ctx: TRequiredContext) => Promise<TOutput>;

/**
 * Extracts the output context type from a middleware.
 *
 * @example
 * ```typescript
 * const authMiddleware = defineMiddleware<AuthContext>()(async () => ({ userId: '123' }));
 * type Output = MiddlewareOutput<typeof authMiddleware>; // AuthContext
 * ```
 */
export type MiddlewareOutput<T> =
  T extends Middleware<infer TOutput, object, unknown, unknown> ? TOutput : never;

/**
 * Extracts the required input context type from a middleware.
 *
 * @example
 * ```typescript
 * const tenantMiddleware = defineMiddleware<TenantContext, AuthContext>()(async (req, env, ctx) => {
 *   return { tenantId: ctx.userId }; // Uses AuthContext
 * });
 * type Input = MiddlewareInput<typeof tenantMiddleware>; // AuthContext
 * ```
 */
export type MiddlewareInput<T> =
  T extends Middleware<object, infer TInput, unknown, unknown> ? TInput : object;
