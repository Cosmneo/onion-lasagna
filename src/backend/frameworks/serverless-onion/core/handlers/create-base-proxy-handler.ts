import type { Controller } from '../../../../core/onion-layers/presentation/interfaces/types/controller.type';
import type {
  BaseRequestMetadata,
  HttpResponse,
} from '../../../../core/onion-layers/presentation/interfaces/types/http';
import type { RouteInput } from '../../../../core/onion-layers/presentation/routing';
import { createRoutingMap } from '../../../../core/onion-layers/presentation/routing';
import { createExceptionHandler, NotFoundException } from '../index';
import { runMiddlewareChain } from '../middleware';
import type { AccumulatedContext, AnyMiddleware } from '../middleware/types';
import { buildHttpRequest } from './build-http-request';
import type { PlatformProxyAdapter } from './types';

/**
 * Base proxy handler configuration shared across platforms.
 *
 * @typeParam TController - Controller type
 * @typeParam TMiddlewares - Readonly tuple of middleware functions
 * @typeParam TEnv - Environment/dependencies type
 * @typeParam TPlatformRequest - Platform-specific request type
 * @typeParam TPlatformResponse - Platform-specific response type
 * @typeParam TMetadata - Request metadata type (extends BaseRequestMetadata)
 * @typeParam TInitialContext - Initial context type for middleware chain
 */
export interface BaseProxyHandlerConfig<
  TController extends Controller,
  TMiddlewares extends readonly AnyMiddleware<TEnv, TPlatformRequest>[],
  TEnv,
  TPlatformRequest,
  TPlatformResponse,
  TMetadata extends BaseRequestMetadata,
  TInitialContext extends object = object,
> {
  /**
   * Service name for logging.
   */
  serviceName: string;

  /**
   * Route definitions for the service.
   */
  routes: RouteInput<TController>[];

  /**
   * Middlewares to run before each request.
   */
  middlewares?: TMiddlewares;

  /**
   * Whether to wrap with exception handling.
   * @default true
   */
  handleExceptions?: boolean;

  /**
   * Extracts request metadata from the platform request.
   * Platform-specific (e.g., requestId, sourceIp for AWS; url for Cloudflare).
   */
  extractMetadata: (request: TPlatformRequest) => TMetadata;

  /**
   * Maps platform request to HttpRequest components.
   * Receives pathParams from the routing resolution.
   *
   * If not provided, uses the adapter's extraction methods via `buildHttpRequest`.
   * Provide a custom implementation for advanced scenarios (e.g., custom body parsing,
   * header normalization, or additional request processing).
   *
   * @default Uses buildHttpRequest(adapter, request, pathParams)
   */
  mapRequest?: (
    request: TPlatformRequest,
    pathParams: Record<string, string>,
  ) => Promise<{
    body: unknown;
    queryParams: Record<string, string | string[]>;
    pathParams: Record<string, string>;
    headers: Record<string, string>;
  }>;

  /**
   * Extracts initial context to pass to middleware chain.
   * Runs BEFORE middlewares, allowing them to depend on this context.
   * Use for authorizer context, pre-computed values, etc.
   *
   * @example
   * ```typescript
   * extractInitialContext: (event) => ({
   *   userId: event.requestContext.authorizer?.lambda?.userId,
   * }),
   * ```
   */
  extractInitialContext?: (request: TPlatformRequest) => TInitialContext;

  /**
   * Pre-handler hook that runs before any processing.
   * If it returns a response, the handler exits early with that response.
   * Use for warmup handling, rate limiting, health checks, etc.
   *
   * @example
   * ```typescript
   * beforeHandle: (event) => {
   *   if (isWarmupCall(event)) return getWarmupResponse();
   *   return undefined; // continue normal processing
   * },
   * ```
   */
  beforeHandle?: (
    request: TPlatformRequest,
    env: TEnv,
  ) => TPlatformResponse | undefined | Promise<TPlatformResponse | undefined>;
}

/**
 * Result of creating a base proxy handler factory.
 */
export type BaseProxyHandlerFactory<TPlatformRequest, TPlatformResponse, TEnv> = <
  TController extends Controller,
  TMiddlewares extends readonly AnyMiddleware<TEnv, TPlatformRequest>[],
  TMetadata extends BaseRequestMetadata,
  TInitialContext extends object = object,
>(
  config: BaseProxyHandlerConfig<
    TController,
    TMiddlewares,
    TEnv,
    TPlatformRequest,
    TPlatformResponse,
    TMetadata,
    TInitialContext
  >,
) => (request: TPlatformRequest, env: TEnv) => Promise<TPlatformResponse>;

/**
 * Creates a platform-agnostic proxy handler factory.
 *
 * This is the core abstraction for multi-route services (e.g., /{proxy+} on AWS,
 * single Worker handling multiple routes on Cloudflare).
 *
 * The factory handles:
 * - Route resolution based on path and method
 * - Middleware chain execution
 * - Request mapping with path parameters
 * - Controller execution
 * - Response conversion
 * - Exception handling (including 404 for unknown routes)
 *
 * Platform-specific concerns (warmup, authorizer context, etc.) should be
 * handled by the runtime before/after calling the base handler.
 *
 * @typeParam TPlatformRequest - Platform's native request type
 * @typeParam TPlatformResponse - Platform's native response type
 * @typeParam TEnv - Environment/dependencies type
 *
 * @param adapter - Platform adapter for routing and response mapping
 * @returns A factory function that creates proxy handlers
 *
 * @example
 * ```typescript
 * // In runtime: create factory with platform adapter
 * const createProxyHandler = createBaseProxyHandler<
 *   Request,
 *   Response,
 *   WorkerEnv
 * >({
 *   extractRouteInfo: (request) => ({
 *     path: new URL(request.url).pathname,
 *     method: request.method,
 *   }),
 *   mapResponse: (response) => new Response(...),
 *   mapExceptionToResponse: (exception) => new Response(...),
 * });
 *
 * // Use factory to create handlers
 * const handler = createProxyHandler({
 *   serviceName: 'UserService',
 *   routes: [
 *     { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
 *     { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserController },
 *   ],
 *   middlewares: [authMiddleware] as const,
 *   extractMetadata: (request) => ({
 *     path: new URL(request.url).pathname,
 *     method: request.method,
 *     url: request.url,
 *   }),
 *   mapRequest: async (request, pathParams) => ({
 *     body: await request.json().catch(() => undefined),
 *     queryParams: Object.fromEntries(new URL(request.url).searchParams),
 *     pathParams,
 *     headers: Object.fromEntries(request.headers),
 *   }),
 * });
 * ```
 */
export function createBaseProxyHandler<TPlatformRequest, TPlatformResponse, TEnv = unknown>(
  adapter: PlatformProxyAdapter<TPlatformRequest, TPlatformResponse>,
): BaseProxyHandlerFactory<TPlatformRequest, TPlatformResponse, TEnv> {
  // Create exception handler wrapper using the platform adapter
  const withExceptionHandler = createExceptionHandler<TPlatformResponse>({
    mapExceptionToResponse: adapter.mapExceptionToResponse,
  });

  return function createProxyHandler<
    TController extends Controller,
    TMiddlewares extends readonly AnyMiddleware<TEnv, TPlatformRequest>[],
    TMetadata extends BaseRequestMetadata,
    TInitialContext extends object = object,
  >(
    config: BaseProxyHandlerConfig<
      TController,
      TMiddlewares,
      TEnv,
      TPlatformRequest,
      TPlatformResponse,
      TMetadata,
      TInitialContext
    >,
  ): (request: TPlatformRequest, env: TEnv) => Promise<TPlatformResponse> {
    const {
      serviceName,
      routes,
      middlewares = [] as unknown as TMiddlewares,
      handleExceptions = true,
      extractMetadata,
      mapRequest,
      extractInitialContext,
      beforeHandle,
    } = config;

    // Create routing map once
    const { resolveRoute } = createRoutingMap(routes);

    const coreHandler = async (
      request: TPlatformRequest,
      env: TEnv,
    ): Promise<TPlatformResponse> => {
      // 1. Run pre-handler hook (for warmup, rate limiting, etc.)
      if (beforeHandle) {
        const earlyResponse = await beforeHandle(request, env);
        if (earlyResponse !== undefined) {
          return earlyResponse;
        }
      }

      // 2. Extract route info from platform request
      const { path, method } = adapter.extractRouteInfo(request);

      // 3. Resolve route
      const resolved = resolveRoute(path, method);
      if (!resolved) {
        throw new NotFoundException({
          message: `No route found for ${method} ${path}`,
          code: 'ROUTE_NOT_FOUND',
        });
      }

      // 4. Extract metadata
      const metadata = extractMetadata(request);

      // 5. Log resolved route
      console.info(
        `[${serviceName}] Resolved route: ${method} ${path} -> ${resolved.route.metadata.method} ${resolved.route.metadata.servicePath}`,
        { pathParams: resolved.pathParams },
      );

      // 6. Extract initial context (e.g., authorizer context)
      const initialContext = extractInitialContext?.(request) ?? ({} as TInitialContext);

      // 7. Run middleware chain with initial context
      let context: TInitialContext & AccumulatedContext<TMiddlewares, TEnv, TPlatformRequest>;

      if (middlewares.length > 0) {
        context = await runMiddlewareChain(request, env, middlewares, initialContext);
      } else {
        context = initialContext as TInitialContext &
          AccumulatedContext<TMiddlewares, TEnv, TPlatformRequest>;
      }

      // 8. Map request with path params (use adapter methods if no custom mapper)
      const httpRequest = mapRequest
        ? await mapRequest(request, resolved.pathParams)
        : await buildHttpRequest(adapter, request, resolved.pathParams);

      // 9. Build controller input
      const controllerInput = {
        metadata,
        context,
        request: httpRequest,
      };

      // 10. Execute controller
      const controllerResponse = (await resolved.route.controller.execute(
        controllerInput,
      )) as HttpResponse;

      // 11. Convert to platform response
      return adapter.mapResponse(controllerResponse);
    };

    // Wrap with exception handler if enabled
    if (handleExceptions) {
      return withExceptionHandler(coreHandler);
    }

    return coreHandler;
  };
}
