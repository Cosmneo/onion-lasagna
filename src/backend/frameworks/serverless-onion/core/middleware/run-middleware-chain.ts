import type { AccumulatedContext } from './types/middleware-chain.type';
import type { Middleware } from './types/middleware.type';

/**
 * Executes a chain of middlewares sequentially, accumulating context.
 *
 * Each middleware receives the accumulated context from all previous middlewares.
 * The output context from each middleware is merged with the accumulated context
 * before being passed to the next middleware.
 *
 * If any middleware throws an exception, execution stops immediately and the
 * exception propagates to the caller (typically caught by the exception handler wrapper).
 *
 * @typeParam TMiddlewares - Readonly tuple of middleware functions
 * @typeParam TEnv - Environment bindings (platform-specific)
 * @typeParam TRequest - Request type (platform-specific)
 * @typeParam TInitialContext - Initial context type (optional)
 *
 * @param request - The incoming request object
 * @param env - Environment bindings
 * @param middlewares - Array of middlewares to execute in order
 * @param initialContext - Optional initial context to seed the middleware chain
 * @returns Promise resolving to the accumulated context from all middlewares
 * @throws Re-throws any exception from middlewares
 *
 * @example
 * ```typescript
 * const context = await runMiddlewareChain(request, env, [
 *   authMiddleware,    // Returns { userId: string; roles: string[] }
 *   tenantMiddleware,  // Returns { tenantId: string }
 * ] as const);
 *
 * // context type: { userId: string; roles: string[]; tenantId: string }
 * console.log(context.userId);
 * console.log(context.tenantId);
 * ```
 *
 * @example
 * ```typescript
 * // With initial context (e.g., from Lambda authorizer)
 * const authorizerContext = { userId: event.requestContext.authorizer?.lambda?.userId };
 * const context = await runMiddlewareChain(request, env, [
 *   tenantMiddleware,  // Can access ctx.userId from authorizer
 * ] as const, authorizerContext);
 * ```
 */
export async function runMiddlewareChain<
  TMiddlewares extends readonly Middleware<object, object, TEnv, TRequest>[],
  TEnv = unknown,
  TRequest = Request,
  TInitialContext extends object = object,
>(
  request: TRequest,
  env: TEnv,
  middlewares: TMiddlewares,
  initialContext?: TInitialContext,
): Promise<TInitialContext & AccumulatedContext<TMiddlewares, TEnv, TRequest>> {
  let accumulatedContext: object = initialContext ?? {};

  for (const middleware of middlewares) {
    // Each middleware receives the accumulated context from previous middlewares
    const middlewareContext = await middleware(request, env, accumulatedContext);

    // Merge the new context with accumulated
    accumulatedContext = {
      ...accumulatedContext,
      ...middlewareContext,
    };
  }

  return accumulatedContext as TInitialContext & AccumulatedContext<TMiddlewares, TEnv, TRequest>;
}
