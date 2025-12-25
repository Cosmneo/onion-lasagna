import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type {
  AnyMiddleware as CoreAnyMiddleware,
  Middleware as CoreMiddleware,
  MiddlewareInput as CoreMiddlewareInput,
  MiddlewareOutput as CoreMiddlewareOutput,
} from '../../../../core';

/**
 * AWS Lambda middleware that processes an API Gateway event and produces context.
 *
 * Middlewares are executed sequentially before the handler. Each middleware
 * receives the accumulated context from all previous middlewares and can
 * add its own context properties.
 *
 * To abort a request, throw an exception (e.g., `UnauthorizedException`).
 * Exceptions are caught by the global exception handler and converted to
 * HTTP responses.
 *
 * **Note:** Unlike Cloudflare Workers, AWS Lambda doesn't have built-in environment
 * bindings. The `env` parameter defaults to `undefined` unless you explicitly provide
 * an `env` object in the handler config.
 *
 * @typeParam TOutput - The context type this middleware produces
 * @typeParam TRequiredContext - Context required from previous middlewares (defaults to empty object)
 * @typeParam TEnv - Environment/dependencies object (defaults to undefined)
 *
 * @example
 * ```typescript
 * // Auth middleware - no dependencies
 * const authMiddleware: Middleware<AuthContext> = async (event, env, ctx) => {
 *   const token = event.headers?.authorization;
 *   if (!token) throw new UnauthorizedException({ message: 'Missing token', code: 'NO_TOKEN' });
 *   return { userId: '123', roles: ['user'] };
 * };
 *
 * // Tenant middleware - depends on AuthContext
 * const tenantMiddleware: Middleware<TenantContext, AuthContext> = async (event, env, ctx) => {
 *   const tenant = await getTenant(ctx.userId); // ctx.userId is typed!
 *   return { tenantId: tenant.id };
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Middleware with injected dependencies
 * interface Deps { db: Database; cache: Cache; }
 *
 * const dataMiddleware: Middleware<DataContext, object, Deps> = async (event, env, ctx) => {
 *   const data = await env.db.query('...');
 *   return { data };
 * };
 *
 * // Provide deps in handler config
 * createLambdaHandler({
 *   env: { db: myDb, cache: myCache },
 *   middlewares: [dataMiddleware] as const,
 *   ...
 * });
 * ```
 */
export type Middleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv = undefined,
> = CoreMiddleware<TOutput, TRequiredContext, TEnv, APIGatewayProxyEventV2>;

/**
 * Extracts the output context type from an AWS middleware.
 *
 * @example
 * ```typescript
 * const authMiddleware = defineMiddleware<AuthContext>()(async () => ({ userId: '123' }));
 * type Output = MiddlewareOutput<typeof authMiddleware>; // AuthContext
 * ```
 */
export type MiddlewareOutput<T> = CoreMiddlewareOutput<T>;

/**
 * Extracts the required input context type from an AWS middleware.
 *
 * @example
 * ```typescript
 * const tenantMiddleware = defineMiddleware<TenantContext, AuthContext>()(async (event, env, ctx) => {
 *   return { tenantId: ctx.userId }; // Uses AuthContext
 * });
 * type Input = MiddlewareInput<typeof tenantMiddleware>; // AuthContext
 * ```
 */
export type MiddlewareInput<T> = CoreMiddlewareInput<T>;

/**
 * An AWS Lambda middleware with any required context.
 *
 * This type is used in constraints where we need to accept middlewares
 * with varying required contexts (e.g., in handler configs, middleware chains).
 *
 * @typeParam TEnv - Environment/dependencies object (defaults to undefined)
 *
 * @see {@link AnyMiddleware} in core for why `any` is necessary
 */
export type AnyMiddleware<TEnv = undefined> = CoreAnyMiddleware<TEnv, APIGatewayProxyEventV2>;
