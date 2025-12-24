import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { Middleware } from './types/middleware.type';

/**
 * Creates a type-safe AWS Lambda middleware definition.
 *
 * Uses a curried pattern to separate output type declaration from the implementation.
 * This is necessary because TypeScript cannot infer generic parameters and
 * function parameters simultaneously.
 *
 * @typeParam TOutput - The context type this middleware produces
 * @typeParam TRequiredContext - Context required from previous middlewares (defaults to empty object)
 * @typeParam TEnv - Environment bindings (defaults to unknown)
 *
 * @returns A function that accepts the middleware handler and returns a typed Middleware
 *
 * @example
 * ```typescript
 * // Middleware with no dependencies (first in chain)
 * const authMiddleware = defineMiddleware<AuthContext>()(
 *   async (event, env, ctx) => {
 *     const token = event.headers?.authorization;
 *     if (!token) {
 *       throw new UnauthorizedException({ message: 'Missing token', code: 'NO_TOKEN' });
 *     }
 *     const user = await validateToken(token);
 *     return { userId: user.id, roles: user.roles };
 *   }
 * );
 *
 * // Middleware with dependency on AuthContext
 * const tenantMiddleware = defineMiddleware<TenantContext, AuthContext>()(
 *   async (event, env, ctx) => {
 *     // ctx.userId is available and typed!
 *     const tenant = await getTenant(ctx.userId);
 *     return { tenantId: tenant.id, tenantName: tenant.name };
 *   }
 * );
 *
 * // Middleware that validates but adds no context
 * const adminMiddleware = defineMiddleware<object, AuthContext>()(
 *   async (event, env, ctx) => {
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
>(): (
  handler: (event: APIGatewayProxyEventV2, env: TEnv, ctx: TRequiredContext) => Promise<TOutput>,
) => Middleware<TOutput, TRequiredContext, TEnv> {
  return (handler) => {
    return handler as Middleware<TOutput, TRequiredContext, TEnv>;
  };
}
