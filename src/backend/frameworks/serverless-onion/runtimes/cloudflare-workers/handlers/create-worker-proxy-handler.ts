import type { Controller } from '../../../../../core/onion-layers/presentation/interfaces/types/controller.type';
import type { BaseRequestMetadata } from '../../../../../core/onion-layers/presentation/interfaces/types/http';
import type { RouteInput } from '../../../../../core/onion-layers/presentation/routing';
import { createBaseProxyHandler, type PlatformProxyAdapter } from '../../../core/handlers';
import type { AnyMiddleware } from '../middleware';
import { mapRequestBody, mapRequestHeaders, mapRequestQueryParams } from '../adapters/request';
import { mapResponse } from '../adapters/response';
import type { WorkerContext, WorkerEnv, WorkerHandler } from '../types';

/**
 * Cloudflare Workers platform adapter for proxy handlers.
 * Maps Request to route info and HttpResponse/HttpException to Response.
 */
const cloudflareProxyAdapter: PlatformProxyAdapter<Request, Response> = {
  extractRouteInfo: (request) => {
    const url = new URL(request.url);
    return {
      path: url.pathname,
      method: request.method,
    };
  },
  extractBody: (request) => mapRequestBody(request),
  extractHeaders: (request) => mapRequestHeaders(request) ?? {},
  extractQueryParams: (request) => mapRequestQueryParams(request) ?? {},
  mapResponse: (response) =>
    mapResponse({
      statusCode: response.statusCode,
      body: response.body,
      headers: response.headers,
    }),
  mapExceptionToResponse: (exception) =>
    mapResponse({
      statusCode: exception.statusCode,
      body: exception.toResponse(),
    }),
};

/**
 * Request metadata extracted from the Cloudflare Workers Request.
 *
 * Extends {@link BaseRequestMetadata} with Cloudflare-specific fields.
 */
export interface RequestMetadata extends BaseRequestMetadata {
  /**
   * The full request URL.
   */
  url: string;
}

/**
 * Configuration for the Worker proxy handler.
 */
export interface CreateWorkerProxyHandlerConfig<
  TController extends Controller = Controller,
  TMiddlewares extends readonly AnyMiddleware<TEnv>[] = readonly [],
  TEnv extends WorkerEnv = WorkerEnv,
> {
  /**
   * Service name for logging (e.g., "UserService").
   */
  serviceName: string;

  /**
   * Route definitions for the service.
   */
  routes: RouteInput<TController>[];

  /**
   * Middlewares to run before each request.
   *
   * Executed in order; each middleware can depend on context from previous ones.
   * The final context type is the intersection of all middleware outputs.
   *
   * If any middleware throws an exception, the request is aborted and the
   * exception is caught by the global exception handler.
   *
   * @example
   * ```typescript
   * middlewares: [authMiddleware, tenantMiddleware] as const,
   * // Controller receives context: AuthContext & TenantContext
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
}

/**
 * Creates a Cloudflare Worker handler for multi-route services.
 *
 * This factory creates a handler that:
 * - Runs middlewares to build execution context
 * - Routes requests to the appropriate controller based on path and method
 * - Extracts path parameters from route patterns (e.g., `/users/{id}`)
 * - Provides centralized exception handling
 *
 * @param config - Handler configuration
 * @returns A Cloudflare Worker fetch handler
 *
 * @example
 * ```typescript
 * interface Env {
 *   MY_KV: KVNamespace;
 *   AUTH_SECRET: string;
 * }
 *
 * // Define middlewares
 * const authMiddleware = defineMiddleware<AuthContext, object, Env>()(
 *   async (request, env) => {
 *     const token = request.headers.get('authorization');
 *     if (!token) throw new UnauthorizedException({ message: 'Missing token', code: 'NO_TOKEN' });
 *     const user = await validateToken(token, env.AUTH_SECRET);
 *     return { userId: user.id, roles: user.roles };
 *   }
 * );
 *
 * const tenantMiddleware = defineMiddleware<TenantContext, AuthContext, Env>()(
 *   async (request, env, ctx) => {
 *     const tenant = await getTenant(ctx.userId, env);
 *     return { tenantId: tenant.id };
 *   }
 * );
 *
 * export default {
 *   fetch: createWorkerProxyHandler({
 *     serviceName: 'UserService',
 *     routes: [
 *       { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
 *       { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserController },
 *     ],
 *     middlewares: [authMiddleware, tenantMiddleware] as const,
 *     // Controller receives: { metadata, context: AuthContext & TenantContext, request }
 *   }),
 * };
 * ```
 */
export function createWorkerProxyHandler<
  TController extends Controller = Controller,
  TMiddlewares extends readonly AnyMiddleware<TEnv>[] = readonly [],
  TEnv extends WorkerEnv = WorkerEnv,
>(config: CreateWorkerProxyHandlerConfig<TController, TMiddlewares, TEnv>): WorkerHandler<TEnv> {
  const {
    serviceName,
    routes,
    middlewares = [] as unknown as TMiddlewares,
    handleExceptions = true,
  } = config;

  // Create base proxy handler using the core factory
  const baseProxyHandlerFactory = createBaseProxyHandler<Request, Response, TEnv>(
    cloudflareProxyAdapter,
  );

  const baseHandler = baseProxyHandlerFactory<TController, TMiddlewares, RequestMetadata>({
    serviceName,
    routes,
    middlewares,
    handleExceptions,
    extractMetadata: (request) => {
      const url = new URL(request.url);
      return {
        path: url.pathname,
        method: request.method,
        url: request.url,
      };
    },
    mapRequest: async (request, pathParams) => ({
      body: await mapRequestBody(request),
      queryParams: mapRequestQueryParams(request) ?? {},
      pathParams,
      headers: mapRequestHeaders(request) ?? {},
    }),
  });

  // Wrap to match WorkerHandler signature (adds unused ctx parameter)
  return (request: Request, env: TEnv, _ctx: WorkerContext): Promise<Response> => {
    return baseHandler(request, env);
  };
}
