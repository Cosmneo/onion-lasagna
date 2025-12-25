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

/**
 * A middleware with any required context.
 *
 * This type is used in constraints where we need to accept middlewares
 * with varying required contexts (e.g., in handler configs, middleware chains).
 *
 * **Why `any` is necessary here:**
 *
 * TypeScript functions are **contravariant** in their parameter types.
 * This means `Middleware<B, AuthContext>` is NOT assignable to
 * `Middleware<B, object>` because the parameter type relationship is reversed:
 * we'd need `object` to be assignable to `AuthContext`, which it isn't.
 *
 * Using `any` for the required context breaks this contravariance,
 * allowing middlewares with different required contexts to be stored
 * together in arrays while preserving type safety through the
 * `AccumulatedContext` type and middleware chain builder.
 *
 * @typeParam TEnv - Environment bindings (platform-specific)
 * @typeParam TRequest - Request type (platform-specific)
 *
 * @example
 * ```typescript
 * // In handler configs, accept any middleware:
 * interface HandlerConfig<
 *   TMiddlewares extends readonly AnyMiddleware<TEnv, TRequest>[]
 * > { ... }
 *
 * // Individual middlewares remain fully typed:
 * const auth: Middleware<AuthContext, object, Env, Request> = ...;
 * const tenant: Middleware<TenantContext, AuthContext, Env, Request> = ...;
 *
 * // Both can be used in the config:
 * const config: HandlerConfig<typeof middlewares> = {
 *   middlewares: [auth, tenant] as const,
 * };
 * ```
 */
export type AnyMiddleware<TEnv = unknown, TRequest = Request> = Middleware<
  object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  TEnv,
  TRequest
>;
