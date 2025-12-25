import type {
  AnyMiddleware as CoreAnyMiddleware,
  Middleware as CoreMiddleware,
  MiddlewareInput as CoreMiddlewareInput,
  MiddlewareOutput as CoreMiddlewareOutput,
} from '../../../../core';
import type { WorkerEnv } from '../../types';

/**
 * Cloudflare Workers middleware that processes a Request and produces context.
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
 * @typeParam TEnv - Environment bindings type (defaults to WorkerEnv)
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
 *
 * @example
 * ```typescript
 * // Middleware using environment bindings
 * interface Env extends WorkerEnv {
 *   MY_KV: KVNamespace;
 *   AUTH_SECRET: string;
 * }
 *
 * const dataMiddleware: Middleware<DataContext, object, Env> = async (request, env, ctx) => {
 *   const data = await env.MY_KV.get('key');
 *   return { data };
 * };
 * ```
 */
export type Middleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv extends WorkerEnv = WorkerEnv,
> = CoreMiddleware<TOutput, TRequiredContext, TEnv, Request>;

/**
 * Extracts the output context type from a Cloudflare middleware.
 *
 * @example
 * ```typescript
 * const authMiddleware = defineMiddleware<AuthContext>()(async () => ({ userId: '123' }));
 * type Output = MiddlewareOutput<typeof authMiddleware>; // AuthContext
 * ```
 */
export type MiddlewareOutput<T> = CoreMiddlewareOutput<T>;

/**
 * Extracts the required input context type from a Cloudflare middleware.
 *
 * @example
 * ```typescript
 * const tenantMiddleware = defineMiddleware<TenantContext, AuthContext>()(async (request, env, ctx) => {
 *   return { tenantId: ctx.userId }; // Uses AuthContext
 * });
 * type Input = MiddlewareInput<typeof tenantMiddleware>; // AuthContext
 * ```
 */
export type MiddlewareInput<T> = CoreMiddlewareInput<T>;

/**
 * A Cloudflare Workers middleware with any required context.
 *
 * This type is used in constraints where we need to accept middlewares
 * with varying required contexts (e.g., in handler configs, middleware chains).
 *
 * @typeParam TEnv - Environment bindings type (defaults to WorkerEnv)
 *
 * @see {@link AnyMiddleware} in core for why `any` is necessary
 */
export type AnyMiddleware<TEnv extends WorkerEnv = WorkerEnv> = CoreAnyMiddleware<TEnv, Request>;
