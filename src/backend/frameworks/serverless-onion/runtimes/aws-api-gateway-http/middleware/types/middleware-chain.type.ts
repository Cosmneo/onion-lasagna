import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type {
  AccumulatedContext as CoreAccumulatedContext,
  EmptyMiddlewareChain as CoreEmptyMiddlewareChain,
  NonEmptyMiddlewareChain as CoreNonEmptyMiddlewareChain,
} from '../../../../core';
import type { Middleware } from './middleware.type';

/**
 * Computes the accumulated context type from a tuple of AWS middlewares.
 *
 * Each middleware's output is intersected with the previous accumulated context,
 * producing a final type that contains all properties from all middlewares.
 *
 * @typeParam TMiddlewares - Readonly tuple of AWS middleware functions
 * @typeParam TEnv - Environment bindings (defaults to unknown)
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
  TEnv = unknown,
> = CoreAccumulatedContext<TMiddlewares, TEnv, APIGatewayProxyEventV2>;

/**
 * Represents an empty middleware chain.
 * Used as the base case for middleware chain type computations.
 */
export type EmptyMiddlewareChain = CoreEmptyMiddlewareChain;

/**
 * Type guard to check if a value is a non-empty AWS middleware array.
 */
export type NonEmptyMiddlewareChain<
  TMiddlewares extends readonly Middleware<object, object, TEnv>[],
  TEnv = unknown,
> = CoreNonEmptyMiddlewareChain<TMiddlewares, TEnv, APIGatewayProxyEventV2>;
