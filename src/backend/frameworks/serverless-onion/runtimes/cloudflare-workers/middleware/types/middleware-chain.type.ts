import type { AccumulatedContext as CoreAccumulatedContext } from '../../../../core';
import type { WorkerEnv } from '../../types';
import type { Middleware } from './middleware.type';

/**
 * Computes the accumulated context type from a tuple of Cloudflare middlewares.
 *
 * Each middleware's output is intersected with the previous accumulated context,
 * producing a final type that contains all properties from all middlewares.
 *
 * @typeParam TMiddlewares - Readonly tuple of Cloudflare middleware functions
 * @typeParam TEnv - Environment bindings type (defaults to WorkerEnv)
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
  TMiddlewares extends readonly Middleware<object, object, TEnv>[],
  TEnv extends WorkerEnv = WorkerEnv,
> = CoreAccumulatedContext<TMiddlewares, TEnv, Request>;
