import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type {
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
 * @typeParam TOutput - The context type this middleware produces
 * @typeParam TRequiredContext - Context required from previous middlewares (defaults to empty object)
 * @typeParam TEnv - Environment bindings (defaults to unknown)
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
 */
export type Middleware<
  TOutput extends object,
  TRequiredContext extends object = object,
  TEnv = unknown,
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
