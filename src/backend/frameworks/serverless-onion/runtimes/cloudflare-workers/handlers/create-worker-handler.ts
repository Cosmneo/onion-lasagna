import type { Controller } from '../../../../../core/onion-layers/presentation/interfaces/types/controller.type';
import type { HttpResponse } from '../../../../../core/onion-layers/presentation/interfaces/types/http';
import {
  createBaseHandler,
  type PlatformAdapter,
  type ResponseMappingOptions,
} from '../../../core/handlers';
import type { ServerlessOnionConfig } from '../../../core/types';
import type { AccumulatedContext, AnyMiddleware } from '../middleware';
import {
  mapRequest,
  mapRequestBody,
  mapRequestHeaders,
  mapRequestQueryParams,
} from '../adapters/request';
import { mapResponse } from '../adapters/response';
import type { WorkerContext, WorkerEnv, WorkerHandler } from '../types';

/**
 * Cloudflare Workers platform adapter.
 * Provides request extraction and response mapping for Web API Request/Response.
 */
const cloudflareAdapter: PlatformAdapter<Request, Response> = {
  extractBody: (request) => mapRequestBody(request),
  extractHeaders: (request) => mapRequestHeaders(request) ?? {},
  extractQueryParams: (request) => mapRequestQueryParams(request) ?? {},
  extractOrigin: (request) => request.headers.get('origin') ?? undefined,
  mapResponse: (response, options?: ResponseMappingOptions) =>
    mapResponse(
      {
        statusCode: response.statusCode,
        body: response.body,
        headers: response.headers,
      },
      { cors: options?.cors, requestOrigin: options?.requestOrigin },
    ),
  mapExceptionToResponse: (exception, options?: ResponseMappingOptions) =>
    mapResponse(
      {
        statusCode: exception.statusCode,
        body: exception.toResponse(),
      },
      { cors: options?.cors, requestOrigin: options?.requestOrigin },
    ),
};

/**
 * Configuration for creating a Cloudflare Worker handler.
 */
export interface CreateWorkerHandlerConfig<
  TInput,
  TOutput,
  TMiddlewares extends readonly AnyMiddleware<TEnv>[] = readonly [],
  TEnv extends WorkerEnv = WorkerEnv,
> {
  /**
   * The controller to execute.
   * Must implement {@link Controller}.
   */
  controller: Controller<TInput, TOutput>;

  /**
   * Middlewares to run before the controller.
   *
   * Executed in order; each middleware can depend on context from previous ones.
   * The accumulated context is passed to `mapInput` for use in building controller input.
   *
   * @example
   * ```typescript
   * middlewares: [authMiddleware, tenantMiddleware] as const,
   * mapInput: async (request, env, middlewareContext) => ({
   *   ...await mapRequest(request),
   *   userId: middlewareContext.userId,
   *   tenantId: middlewareContext.tenantId,
   * }),
   * ```
   */
  middlewares?: TMiddlewares;

  /**
   * Whether to wrap the handler with exception handling.
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
   * When middlewares are used, receives the accumulated context as the 3rd parameter.
   *
   * @default Uses mapRequest to create HttpRequest
   */
  mapInput?: (
    request: Request,
    env: TEnv,
    middlewareContext: AccumulatedContext<TMiddlewares, TEnv>,
  ) => TInput | Promise<TInput>;

  /**
   * Maps controller output to HttpResponse.
   * If not provided, assumes the controller returns an HttpResponse.
   */
  mapOutput?: (output: TOutput) => HttpResponse;

  /**
   * Framework configuration including CORS and other settings.
   *
   * @example Configure CORS
   * ```typescript
   * createWorkerHandler({
   *   controller: myController,
   *   config: {
   *     cors: {
   *       origin: 'https://myapp.com',
   *       credentials: true,
   *     },
   *   },
   * });
   * ```
   *
   * @example Disable CORS headers
   * ```typescript
   * createWorkerHandler({
   *   controller: myController,
   *   config: { cors: false },
   * });
   * ```
   */
  config?: ServerlessOnionConfig;
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
 *   mapInput: async (request, env, middlewareContext) => ({
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
  TMiddlewares extends readonly AnyMiddleware<TEnv>[] = readonly [],
  TEnv extends WorkerEnv = WorkerEnv,
>(
  handlerConfig: CreateWorkerHandlerConfig<TInput, TOutput, TMiddlewares, TEnv>,
): WorkerHandler<TEnv> {
  const {
    controller,
    middlewares = [] as unknown as TMiddlewares,
    handleExceptions = true,
    mapInput = async (request: Request) => (await mapRequest(request)) as TInput,
    mapOutput = (output: TOutput) => output as unknown as HttpResponse,
    config,
  } = handlerConfig;

  // Create base handler using the core factory
  const baseHandlerFactory = createBaseHandler<Request, Response, TEnv>(cloudflareAdapter);

  const baseHandler = baseHandlerFactory({
    controller,
    middlewares,
    mapInput,
    mapOutput,
    handleExceptions,
    config,
  });

  // Wrap to match WorkerHandler signature (adds unused ctx parameter)
  return (request: Request, env: TEnv, _ctx: WorkerContext): Promise<Response> => {
    return baseHandler(request, env);
  };
}
