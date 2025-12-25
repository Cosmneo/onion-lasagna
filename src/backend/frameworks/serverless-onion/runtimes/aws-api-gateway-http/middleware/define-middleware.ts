import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { Middleware } from './types/middleware.type';

/**
 * Creates a type-safe AWS Lambda middleware definition.
 *
 * Uses a curried pattern to separate output type declaration from the implementation.
 * This is necessary because TypeScript cannot infer generic parameters and
 * function parameters simultaneously.
 *
 * **IMPORTANT: Use namespaced keys to prevent context collisions.**
 * Each middleware should wrap its context in a unique namespace key.
 *
 * **Note:** Unlike Cloudflare Workers, AWS Lambda doesn't have built-in environment
 * bindings. The `env` parameter defaults to `undefined` unless you explicitly provide
 * an `env` object in the handler config.
 *
 * @typeParam TOutput - The context type this middleware produces
 * @typeParam TRequiredContext - Context required from previous middlewares (defaults to empty object)
 * @typeParam TEnv - Environment/dependencies object (defaults to undefined)
 *
 * @returns A function that accepts the middleware handler and returns a typed Middleware
 *
 * @example
 * ```typescript
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
 * const authMiddleware = defineMiddleware<AuthContext>()(
 *   async (event, env, ctx) => {
 *     const token = event.headers?.authorization;
 *     if (!token) {
 *       throw new UnauthorizedException({ message: 'Missing token', code: 'NO_TOKEN' });
 *     }
 *     const user = await validateToken(token);
 *     return { auth: { userId: user.id, roles: user.roles } };
 *   }
 * );
 *
 * // Middleware with dependency on AuthContext
 * const tenantMiddleware = defineMiddleware<TenantContext, AuthContext>()(
 *   async (event, env, ctx) => {
 *     // ctx.auth.userId is available and typed!
 *     const tenant = await getTenant(ctx.auth.userId);
 *     return { tenant: { id: tenant.id, name: tenant.name } };
 *   }
 * );
 *
 * // Middleware that validates but adds no context
 * const adminMiddleware = defineMiddleware<object, AuthContext>()(
 *   async (event, env, ctx) => {
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
 * // Middleware with injected dependencies (namespaced)
 * interface Deps { db: Database; cache: Cache; }
 * interface DataContext {
 *   appData: { users: User[] };
 * }
 *
 * const dataMiddleware = defineMiddleware<DataContext, object, Deps>()(
 *   async (event, env, ctx) => {
 *     const users = await env.db.query('...');
 *     return { appData: { users } };
 *   }
 * );
 *
 * // Provide deps in handler config
 * createLambdaHandler({
 *   env: { db: myDb, cache: myCache },
 *   middlewares: [dataMiddleware] as const,
 *   ...
 * });
 * ```
 */
export function defineMiddleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv = undefined,
>(): (
  handler: (event: APIGatewayProxyEventV2, env: TEnv, ctx: TRequiredContext) => Promise<TOutput>,
) => Middleware<TOutput, TRequiredContext, TEnv> {
  return (handler) => {
    return handler as Middleware<TOutput, TRequiredContext, TEnv>;
  };
}
