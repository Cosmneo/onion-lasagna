import type { Controller } from '../../../../../core/onion-layers/presentation/interfaces/types/controller.type';
import type {
  BaseRequestMetadata,
  HttpResponse,
} from '../../../../../core/onion-layers/presentation/interfaces/types/http';
import type {
  ResolvedRoute,
  RouteInput,
} from '../../../../../core/onion-layers/presentation/routing';
import { createRoutingMap } from '../../../../../core/onion-layers/presentation/routing';
import { NotFoundException, runMiddlewareChain } from '../../../core';
import type { AccumulatedContext, Middleware } from '../middleware';
import { mapRequestBody, mapRequestHeaders, mapRequestQueryParams } from '../adapters/request';
import { mapResponse } from '../adapters/response';
import type { WorkerContext, WorkerEnv, WorkerHandler } from '../types';
import { withExceptionHandler } from '../wrappers/with-exception-handler';

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
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
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
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
  TEnv extends WorkerEnv = WorkerEnv,
>(config: CreateWorkerProxyHandlerConfig<TController, TMiddlewares, TEnv>): WorkerHandler<TEnv> {
  const {
    serviceName,
    routes,
    middlewares = [] as unknown as TMiddlewares,
    handleExceptions = true,
  } = config;

  // Create routing map
  const { resolveRoute } = createRoutingMap(routes);

  const coreHandler: WorkerHandler<TEnv> = async (
    request: Request,
    env: TEnv,
    _ctx: WorkerContext,
  ): Promise<Response> => {
    const url = new URL(request.url);

    // Extract request metadata
    const requestMetadata: RequestMetadata = {
      path: url.pathname,
      method: request.method,
      url: request.url,
    };

    // Resolve route
    const resolved = resolveRoute(requestMetadata.path, requestMetadata.method);
    if (!resolved) {
      throw new NotFoundException({
        message: `No route found for ${requestMetadata.method} ${requestMetadata.path}`,
        code: 'ROUTE_NOT_FOUND',
      });
    }

    // Log resolved route
    console.info(
      `[${serviceName}] Resolved route: ${requestMetadata.method} ${requestMetadata.path} -> ${resolved.route.metadata.method} ${resolved.route.metadata.servicePath}`,
      { pathParams: resolved.pathParams },
    );

    // Build context from middleware chain
    const context: AccumulatedContext<TMiddlewares, TEnv> =
      middlewares.length > 0
        ? await runMiddlewareChain(request, env, middlewares)
        : ({} as AccumulatedContext<TMiddlewares, TEnv>);

    // Build controller input
    const controllerInput = {
      metadata: requestMetadata,
      context,
      request: await mapWorkerProxyRequest(request, resolved),
    };

    // Execute controller
    const controllerResponse = (await resolved.route.controller.execute(
      controllerInput,
    )) as HttpResponse;

    // Map response
    return mapResponse(controllerResponse);
  };

  // Wrap with exception handler if enabled
  if (handleExceptions) {
    return withExceptionHandler(coreHandler);
  }

  return coreHandler;
}

/**
 * Maps a Cloudflare Workers Request to HttpRequest format for proxy routes.
 */
async function mapWorkerProxyRequest<TController extends Controller>(
  request: Request,
  resolved: ResolvedRoute<TController>,
) {
  return {
    body: await mapRequestBody(request),
    queryParams: mapRequestQueryParams(request),
    pathParams: resolved.pathParams,
    headers: mapRequestHeaders(request),
  };
}
