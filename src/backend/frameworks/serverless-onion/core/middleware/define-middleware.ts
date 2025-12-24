import type { Middleware } from './types/middleware.type';

/**
 * Creates a type-safe middleware definition.
 *
 * Uses a curried pattern to separate output type declaration from the implementation.
 * This is necessary because TypeScript cannot infer generic parameters and
 * function parameters simultaneously.
 *
 * @typeParam TOutput - The context type this middleware produces
 * @typeParam TRequiredContext - Context required from previous middlewares (defaults to empty object)
 * @typeParam TEnv - Environment bindings (platform-specific, defaults to unknown)
 * @typeParam TRequest - Request type (defaults to Web API Request)
 *
 * @returns A function that accepts the middleware handler and returns a typed Middleware
 *
 * @example
 * ```typescript
 * // Middleware with no dependencies (first in chain)
 * const authMiddleware = defineMiddleware<AuthContext, object, Env>()(
 *   async (request, env) => {
 *     const token = request.headers.get('authorization');
 *     if (!token) {
 *       throw new UnauthorizedException({ message: 'Missing token', code: 'NO_TOKEN' });
 *     }
 *     const user = await validateToken(token, env.AUTH_SECRET);
 *     return { userId: user.id, roles: user.roles };
 *   }
 * );
 *
 * // Middleware with dependency on AuthContext
 * const tenantMiddleware = defineMiddleware<TenantContext, AuthContext, Env>()(
 *   async (request, env, ctx) => {
 *     // ctx.userId is available and typed!
 *     const tenant = await getTenant(ctx.userId, env.DB);
 *     return { tenantId: tenant.id, tenantName: tenant.name };
 *   }
 * );
 *
 * // Middleware that validates but adds no context
 * const adminMiddleware = defineMiddleware<object, AuthContext>()(
 *   async (request, env, ctx) => {
 *     if (!ctx.roles.includes('admin')) {
 *       throw new ForbiddenException({ message: 'Admin access required', code: 'NOT_ADMIN' });
 *     }
 *     return {}; // No additional context
 *   }
 * );
 * ```
 */
export function defineMiddleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv = unknown,
  TRequest = Request,
>(): (
  handler: (request: TRequest, env: TEnv, ctx: TRequiredContext) => Promise<TOutput>,
) => Middleware<TOutput, TRequiredContext, TEnv, TRequest> {
  return (handler) => {
    return handler as Middleware<TOutput, TRequiredContext, TEnv, TRequest>;
  };
}
