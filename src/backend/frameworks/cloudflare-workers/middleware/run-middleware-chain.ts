import type { WorkerEnv } from '../types/worker-handler.type';
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
 * exception propagates to the caller (typically caught by `withExceptionHandler`).
 *
 * @typeParam TMiddlewares - Readonly tuple of middleware functions
 * @typeParam TEnv - Cloudflare Worker environment bindings
 *
 * @param request - The incoming Request object
 * @param env - Cloudflare Worker environment bindings
 * @param middlewares - Array of middlewares to execute in order
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
 */
export async function runMiddlewareChain<
  TMiddlewares extends readonly Middleware<object, object, TEnv>[],
  TEnv extends WorkerEnv = WorkerEnv,
>(
  request: Request,
  env: TEnv,
  middlewares: TMiddlewares,
): Promise<AccumulatedContext<TMiddlewares, TEnv>> {
  let accumulatedContext: object = {};

  for (const middleware of middlewares) {
    // Each middleware receives the accumulated context from previous middlewares
    const middlewareContext = await middleware(request, env, accumulatedContext);

    // Merge the new context with accumulated
    accumulatedContext = {
      ...accumulatedContext,
      ...middlewareContext,
    };
  }

  return accumulatedContext as AccumulatedContext<TMiddlewares, TEnv>;
}
