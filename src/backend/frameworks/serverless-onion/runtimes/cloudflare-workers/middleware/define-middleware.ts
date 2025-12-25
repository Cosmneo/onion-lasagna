import type { WorkerEnv } from '../types';
import type { Middleware } from './types/middleware.type';

/**
 * Creates a type-safe Cloudflare Workers middleware definition.
 *
 * Uses a curried pattern to separate output type declaration from the implementation.
 * This is necessary because TypeScript cannot infer generic parameters and
 * function parameters simultaneously.
 *
 * **IMPORTANT: Use namespaced keys to prevent context collisions.**
 * Each middleware should wrap its context in a unique namespace key.
 *
 * @typeParam TOutput - The context type this middleware produces
 * @typeParam TRequiredContext - Context required from previous middlewares (defaults to empty object)
 * @typeParam TEnv - Environment bindings type (defaults to WorkerEnv)
 *
 * @returns A function that accepts the middleware handler and returns a typed Middleware
 *
 * @example
 * ```typescript
 * interface Env extends WorkerEnv {
 *   AUTH_SECRET: string;
 *   MY_KV: KVNamespace;
 * }
 *
 * // Define namespaced context types
 * interface AuthContext {
 *   auth: { userId: string; roles: string[] };
 * }
 *
 * interface TenantContext {
 *   tenant: { id: string; name: string };
 * }
 *
 * // Middleware with no dependencies (first in chain)
 * const authMiddleware = defineMiddleware<AuthContext, object, Env>()(
 *   async (request, env, ctx) => {
 *     const token = request.headers.get('authorization');
 *     if (!token) {
 *       throw new UnauthorizedException({ message: 'Missing token', code: 'NO_TOKEN' });
 *     }
 *     const user = await validateToken(token, env.AUTH_SECRET);
 *     return { auth: { userId: user.id, roles: user.roles } };
 *   }
 * );
 *
 * // Middleware with dependency on AuthContext
 * const tenantMiddleware = defineMiddleware<TenantContext, AuthContext, Env>()(
 *   async (request, env, ctx) => {
 *     // ctx.auth.userId is available and typed!
 *     const tenant = await getTenant(ctx.auth.userId);
 *     return { tenant: { id: tenant.id, name: tenant.name } };
 *   }
 * );
 *
 * // Middleware that validates but adds no context
 * const adminMiddleware = defineMiddleware<object, AuthContext, Env>()(
 *   async (request, env, ctx) => {
 *     if (!ctx.auth.roles.includes('admin')) {
 *       throw new ForbiddenException({ message: 'Admin access required', code: 'NOT_ADMIN' });
 *     }
 *     return {}; // No additional context
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Using with handler
 * export default {
 *   fetch: createWorkerProxyHandler({
 *     serviceName: 'UserService',
 *     routes: [...],
 *     middlewares: [authMiddleware, tenantMiddleware] as const,
 *   }),
 * };
 * // Controller receives: ctx.auth.userId, ctx.tenant.id
 * ```
 */
export function defineMiddleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv extends WorkerEnv = WorkerEnv,
>(): (
  handler: (request: Request, env: TEnv, ctx: TRequiredContext) => Promise<TOutput>,
) => Middleware<TOutput, TRequiredContext, TEnv> {
  return (handler) => {
    return handler as Middleware<TOutput, TRequiredContext, TEnv>;
  };
}
