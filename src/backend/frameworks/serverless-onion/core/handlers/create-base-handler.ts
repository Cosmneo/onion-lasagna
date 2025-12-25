import type { Controller } from '../../../../core/onion-layers/presentation/interfaces/types/controller.type';
import type { HttpResponse } from '../../../../core/onion-layers/presentation/interfaces/types/http';
import { assertHttpResponse } from '../../../../core/onion-layers/presentation/utils';
import { createExceptionHandler } from '../wrappers';
import { runMiddlewareChain } from '../middleware';
import type { AccumulatedContext, AnyMiddleware } from '../middleware/types';
import type { ServerlessOnionConfig } from '../types';
import type { PlatformAdapter, ResponseMappingOptions } from './types';
import { resolveCorsConfig } from './types';

/**
 * Base handler configuration shared across all platforms.
 *
 * Platform-specific handler factories extend this with additional options
 * (e.g., warmup handling for AWS, env bindings for Cloudflare).
 *
 * @typeParam TInput - Controller input type
 * @typeParam TOutput - Controller output type
 * @typeParam TMiddlewares - Readonly tuple of middleware functions
 * @typeParam TEnv - Environment/dependencies type
 * @typeParam TPlatformRequest - Platform-specific request type
 */
export interface BaseHandlerConfig<
  TInput,
  TOutput,
  TMiddlewares extends readonly AnyMiddleware<TEnv, TPlatformRequest>[],
  TEnv,
  TPlatformRequest,
> {
  /**
   * The controller that handles the request.
   */
  controller: Controller<TInput, TOutput>;

  /**
   * Middlewares to run before the controller.
   * Executed in order; each can depend on context from previous ones.
   */
  middlewares?: TMiddlewares;

  /**
   * Maps platform request to controller input.
   * Receives the platform request, environment, and accumulated middleware context.
   *
   * If not provided, uses the adapter's extraction methods to build an HttpRequest-like object.
   * Provide a custom implementation for controllers that need a different input shape.
   *
   * @default Uses adapter.extractBody, extractHeaders, extractQueryParams
   */
  mapInput?: (
    request: TPlatformRequest,
    env: TEnv,
    middlewareContext: AccumulatedContext<TMiddlewares, TEnv, TPlatformRequest>,
  ) => TInput | Promise<TInput>;

  /**
   * Maps controller output to HttpResponse.
   * If not provided, assumes controller returns HttpResponse.
   */
  mapOutput?: (output: TOutput) => HttpResponse;

  /**
   * Whether to wrap with exception handling.
   * @default true
   */
  handleExceptions?: boolean;

  /**
   * Framework configuration including CORS and other settings.
   *
   * @example Configure CORS
   * ```typescript
   * config: {
   *   cors: {
   *     origin: 'https://myapp.com',
   *     credentials: true,
   *   },
   * }
   * ```
   *
   * @example Disable CORS headers
   * ```typescript
   * config: {
   *   cors: false,
   * }
   * ```
   */
  config?: ServerlessOnionConfig;
}

/**
 * Result of creating a base handler factory.
 * The factory is pre-configured with the platform adapter and returns handlers.
 */
export type BaseHandlerFactory<TPlatformRequest, TPlatformResponse, TEnv> = <
  TInput,
  TOutput,
  TMiddlewares extends readonly AnyMiddleware<TEnv, TPlatformRequest>[],
>(
  config: BaseHandlerConfig<TInput, TOutput, TMiddlewares, TEnv, TPlatformRequest>,
) => (request: TPlatformRequest, env: TEnv) => Promise<TPlatformResponse>;

/**
 * Creates a platform-agnostic handler factory.
 *
 * This is the core abstraction that enables handler reuse across platforms.
 * Platform runtimes call this with their adapter to get a handler factory,
 * then use that factory to create handlers.
 *
 * The factory handles:
 * - Middleware chain execution
 * - Input mapping (platform request → controller input)
 * - Controller execution
 * - Output mapping (controller output → HttpResponse)
 * - Response conversion (HttpResponse → platform response)
 * - Exception handling (optional)
 *
 * Platform-specific concerns (warmup, authorizer context, etc.) should be
 * handled by the runtime before/after calling the base handler.
 *
 * @typeParam TPlatformRequest - Platform's native request type
 * @typeParam TPlatformResponse - Platform's native response type
 * @typeParam TEnv - Environment/dependencies type
 *
 * @param adapter - Platform adapter for response mapping
 * @returns A factory function that creates handlers
 *
 * @example
 * ```typescript
 * // In runtime: create factory with platform adapter
 * const createHandler = createBaseHandler<Request, Response, WorkerEnv>({
 *   mapResponse: (response) => new Response(JSON.stringify(response.body), {
 *     status: response.statusCode,
 *     headers: response.headers,
 *   }),
 *   mapExceptionToResponse: (exception) => new Response(
 *     JSON.stringify(exception.toResponse()),
 *     { status: exception.statusCode },
 *   ),
 * });
 *
 * // Use factory to create handlers
 * const handler = createHandler({
 *   controller: myController,
 *   middlewares: [authMiddleware] as const,
 *   mapInput: async (request, env, ctx) => ({
 *     body: await request.json(),
 *     userId: ctx.userId,
 *   }),
 * });
 *
 * // Export as Worker
 * export default { fetch: handler };
 * ```
 */
export function createBaseHandler<TPlatformRequest, TPlatformResponse, TEnv = unknown>(
  adapter: PlatformAdapter<TPlatformRequest, TPlatformResponse>,
): BaseHandlerFactory<TPlatformRequest, TPlatformResponse, TEnv> {
  return function createHandler<
    TInput,
    TOutput,
    TMiddlewares extends readonly AnyMiddleware<TEnv, TPlatformRequest>[],
  >(
    handlerConfig: BaseHandlerConfig<TInput, TOutput, TMiddlewares, TEnv, TPlatformRequest>,
  ): (request: TPlatformRequest, env: TEnv) => Promise<TPlatformResponse> {
    const {
      controller,
      middlewares = [] as unknown as TMiddlewares,
      mapInput,
      mapOutput = (output: TOutput) => output as unknown as HttpResponse,
      handleExceptions = true,
      config,
    } = handlerConfig;

    // Resolve CORS config from framework config
    const corsConfig = resolveCorsConfig(config);

    const coreHandler = async (
      request: TPlatformRequest,
      env: TEnv,
    ): Promise<TPlatformResponse> => {
      // Extract request origin for dynamic CORS matching
      const requestOrigin = adapter.extractOrigin?.(request);

      // Build response mapping options
      const responseOptions: ResponseMappingOptions = {
        cors: corsConfig,
        requestOrigin,
      };

      // 1. Run middleware chain
      let middlewareContext: AccumulatedContext<TMiddlewares, TEnv, TPlatformRequest>;

      if (middlewares.length > 0) {
        middlewareContext = await runMiddlewareChain(request, env, middlewares);
      } else {
        middlewareContext = {} as AccumulatedContext<TMiddlewares, TEnv, TPlatformRequest>;
      }

      // 2. Map input (use adapter extraction methods if no custom mapper)
      let input: TInput;
      if (mapInput) {
        input = await mapInput(request, env, middlewareContext);
      } else {
        // Default: build HttpRequest-like object from adapter extraction
        input = {
          body: await adapter.extractBody(request),
          headers: adapter.extractHeaders(request),
          queryParams: adapter.extractQueryParams(request),
        } as TInput;
      }

      // 3. Execute controller
      const output = await controller.execute(input);

      // 4. Map output to HttpResponse
      const httpResponse = mapOutput(output);
      assertHttpResponse(httpResponse, 'mapOutput result');

      // 5. Convert to platform response with CORS headers
      return adapter.mapResponse(httpResponse, responseOptions);
    };

    // Wrap with exception handler if enabled
    if (handleExceptions) {
      // Create exception handler with CORS config (note: request origin is set at handler call time)
      const withExceptionHandler = createExceptionHandler<TPlatformResponse>({
        mapExceptionToResponse: adapter.mapExceptionToResponse,
        responseOptions: { cors: corsConfig },
      });
      return withExceptionHandler(coreHandler);
    }

    return coreHandler;
  };
}
