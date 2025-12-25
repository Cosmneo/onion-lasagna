import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { AccumulatedContext as CoreAccumulatedContext } from '../../../../core';
import type { AnyMiddleware } from './middleware.type';

/**
 * Computes the accumulated context type from a tuple of AWS middlewares.
 *
 * Each middleware's output is intersected with the previous accumulated context,
 * producing a final type that contains all properties from all middlewares.
 *
 * @typeParam TMiddlewares - Readonly tuple of AWS middleware functions
 * @typeParam TEnv - Environment/dependencies object (defaults to undefined)
 *
 * @example
 * ```typescript
 * interface AuthContext { userId: string; }
 * interface TenantContext { tenantId: string; }
 *
 * type Middlewares = readonly [
 *   Middleware<AuthContext>,
 *   Middleware<TenantContext, AuthContext>,
 * ];
 *
 * type Context = AccumulatedContext<Middlewares>;
 * // Context = AuthContext & TenantContext = { userId: string; tenantId: string; }
 * ```
 */
export type AccumulatedContext<
  TMiddlewares extends readonly AnyMiddleware<TEnv>[],
  TEnv = undefined,
> = CoreAccumulatedContext<TMiddlewares, TEnv, APIGatewayProxyEventV2>;
