import type { WorkerEnv } from '../../types/worker-handler.type';
import type { Middleware, MiddlewareOutput } from './middleware.type';

/**
 * Computes the accumulated context type from a tuple of middlewares.
 *
 * Each middleware's output is intersected with the previous accumulated context,
 * producing a final type that contains all properties from all middlewares.
 *
 * @typeParam TMiddlewares - Readonly tuple of middleware functions
 * @typeParam TEnv - Cloudflare Worker environment bindings
 * @typeParam TAcc - Accumulated context (internal, starts as empty object)
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
  TAcc extends object = object,
> = TMiddlewares extends readonly [
  infer Head extends Middleware<object, object, TEnv>,
  ...infer Tail extends readonly Middleware<object, object, TEnv>[],
]
  ? AccumulatedContext<Tail, TEnv, TAcc & MiddlewareOutput<Head>>
  : TAcc;

/**
 * Represents an empty middleware chain.
 * Used as the base case for middleware chain type computations.
 */
export type EmptyMiddlewareChain = readonly [];

/**
 * Type guard to check if a value is a non-empty middleware array.
 */
export type NonEmptyMiddlewareChain<
  TMiddlewares extends readonly Middleware<object, object, TEnv>[],
  TEnv extends WorkerEnv = WorkerEnv,
> = TMiddlewares extends readonly [
  Middleware<object, object, TEnv>,
  ...Middleware<object, object, TEnv>[],
]
  ? TMiddlewares
  : never;
