import type { HttpResponse } from '../../../core/bounded-context/presentation/interfaces/types/http-response';
import { mapRequest } from '../mappers/request';
import { mapResponse } from '../mappers/response';
import { runMiddlewareChain, withExceptionHandler } from '../middleware';
import type { AccumulatedContext, Middleware } from '../middleware';
import type { WorkerContext, WorkerEnv, WorkerHandler } from '../types';

/**
 * Controller interface for single-route handlers.
 */
export interface WorkerController<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

/**
 * Configuration for creating a Cloudflare Worker handler.
 */
export interface CreateWorkerHandlerConfig<
  TInput,
  TOutput,
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
  TEnv extends WorkerEnv = WorkerEnv,
> {
  /**
   * The controller to execute.
   */
  controller: WorkerController<TInput, TOutput>;

  /**
   * Middlewares to run before the controller.
   *
   * Executed in order; each middleware can depend on context from previous ones.
   * The accumulated context is passed to `mapInput` for use in building controller input.
   *
   * @example
   * ```typescript
   * middlewares: [authMiddleware, tenantMiddleware] as const,
   * mapInput: async (request, env, ctx, middlewareContext) => ({
   *   ...await mapRequest(request),
   *   userId: middlewareContext.userId,
   *   tenantId: middlewareContext.tenantId,
   * }),
   * ```
   */
  middlewares?: TMiddlewares;

  /**
   * Whether to wrap the handler with exception handling middleware.
   *
   * When enabled, all exceptions (from middlewares and controllers) are
   * caught and converted to HTTP responses.
   *
   * @default true
   */
  handleExceptions?: boolean;

  /**
   * Maps the Request to controller input.
   *
   * When middlewares are used, receives the accumulated context as the 4th parameter.
   *
   * @default Uses mapRequest to create HttpRequest
   */
  mapInput?: (
    request: Request,
    env: TEnv,
    ctx: WorkerContext,
    middlewareContext: AccumulatedContext<TMiddlewares, TEnv>,
  ) => Promise<TInput>;

  /**
   * Maps controller output to HttpResponse.
   * @default Returns output as-is if it's an HttpResponse, otherwise wraps in 200 response
   */
  mapOutput?: (output: TOutput) => HttpResponse;
}

/**
 * Creates a Cloudflare Worker handler for a single controller.
 *
 * This factory creates a handler that:
 * 1. Runs middlewares to build execution context (optional)
 * 2. Maps the incoming Request to controller input
 * 3. Executes the controller
 * 4. Maps the output to a Response
 * 5. Handles exceptions (optional, default: true)
 *
 * @param config - Handler configuration
 * @returns A Cloudflare Worker fetch handler
 *
 * @example
 * ```typescript
 * // Simple handler without middlewares
 * const handler = createWorkerHandler({
 *   controller: myController,
 *   mapInput: async (request, env) => ({
 *     ...await mapRequest(request),
 *     apiKey: env.API_KEY,
 *   }),
 *   mapOutput: (result) => ({
 *     statusCode: 201,
 *     body: result,
 *   }),
 * });
 *
 * export default { fetch: handler };
 * ```
 *
 * @example
 * ```typescript
 * // Handler with middlewares
 * const authMiddleware = defineMiddleware<AuthContext, object, Env>()(
 *   async (request, env) => {
 *     const token = request.headers.get('authorization');
 *     if (!token) throw new UnauthorizedException({ message: 'Missing token', code: 'NO_TOKEN' });
 *     return { userId: '123' };
 *   }
 * );
 *
 * const handler = createWorkerHandler({
 *   controller: myController,
 *   middlewares: [authMiddleware] as const,
 *   mapInput: async (request, env, ctx, middlewareContext) => ({
 *     ...await mapRequest(request),
 *     userId: middlewareContext.userId, // Type-safe!
 *   }),
 * });
 *
 * export default { fetch: handler };
 * ```
 */
export function createWorkerHandler<
  TInput,
  TOutput,
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
  TEnv extends WorkerEnv = WorkerEnv,
>(config: CreateWorkerHandlerConfig<TInput, TOutput, TMiddlewares, TEnv>): WorkerHandler<TEnv> {
  const {
    controller,
    middlewares = [] as unknown as TMiddlewares,
    handleExceptions = true,
    mapInput = async (request: Request) => (await mapRequest(request)) as TInput,
    mapOutput = (output: TOutput) => {
      // If output is already an HttpResponse, use it
      if (
        output &&
        typeof output === 'object' &&
        'statusCode' in output &&
        typeof (output as HttpResponse).statusCode === 'number'
      ) {
        return output as HttpResponse;
      }
      // Otherwise wrap in a 200 response
      return {
        statusCode: 200,
        body: output,
      };
    },
  } = config;

  const coreHandler: WorkerHandler<TEnv> = async (
    request: Request,
    env: TEnv,
    ctx: WorkerContext,
  ): Promise<Response> => {
    // Run middleware chain if middlewares are provided
    let middlewareContext: AccumulatedContext<TMiddlewares, TEnv>;

    if (middlewares.length > 0) {
      middlewareContext = await runMiddlewareChain(request, env, middlewares);
    } else {
      middlewareContext = {} as AccumulatedContext<TMiddlewares, TEnv>;
    }

    // Map input (now receives middleware context)
    const input = await mapInput(request, env, ctx, middlewareContext);

    // Execute controller
    const output = await controller.execute(input);

    // Map output to HTTP response
    const httpResponse = mapOutput(output);

    // Convert to Cloudflare Response
    return mapResponse(httpResponse);
  };

  // Wrap with exception handler if enabled
  if (handleExceptions) {
    return withExceptionHandler(coreHandler);
  }

  return coreHandler;
}
