import type { HttpResponse } from '../../../core/bounded-context/presentation/interfaces/types/http-response';
import { NotFoundException } from '../exceptions';
import { mapRequestBody, mapRequestHeaders, mapRequestQueryParams } from '../mappers/request';
import { mapResponse } from '../mappers/response';
import { runMiddlewareChain, withExceptionHandler } from '../middleware';
import type { AccumulatedContext, Middleware } from '../middleware';
import { createRoutingMap } from '../routing';
import type { ExecutableController, ResolvedRoute, RouteInput } from '../routing/types';
import type { WorkerContext, WorkerEnv, WorkerHandler } from '../types';

/**
 * Request metadata extracted from the Cloudflare Workers Request.
 */
export interface RequestMetadata {
  /**
   * The request path (e.g., '/users/123').
   */
  path: string;

  /**
   * The HTTP method (e.g., 'GET', 'POST').
   */
  method: string;

  /**
   * The full request URL.
   */
  url: string;
}

/**
 * Configuration for the Worker proxy handler.
 */
export interface CreateWorkerProxyHandlerConfig<
  TController extends ExecutableController = ExecutableController,
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
   * Whether to wrap the handler with exception handling middleware.
   *
   * When enabled, all exceptions (from middlewares and controllers) are
   * caught and converted to HTTP responses.
   *
   * @default true
   */
  handleExceptions?: boolean;

  /**
   * Maps the Request to an execution context.
   *
   * @deprecated Use `middlewares` instead for type-safe context injection.
   * This option is kept for backward compatibility.
   *
   * @default () => ({})
   */
  mapExecutionContext?: (request: Request, env: TEnv) => unknown | Promise<unknown>;
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
  TController extends ExecutableController = ExecutableController,
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
  TEnv extends WorkerEnv = WorkerEnv,
>(config: CreateWorkerProxyHandlerConfig<TController, TMiddlewares, TEnv>): WorkerHandler<TEnv> {
  const {
    serviceName,
    routes,
    middlewares = [] as unknown as TMiddlewares,
    handleExceptions = true,
    mapExecutionContext,
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

    // Build context from middlewares or legacy mapExecutionContext
    let context: AccumulatedContext<TMiddlewares, TEnv>;

    if (middlewares.length > 0) {
      // Run middleware chain to accumulate context
      context = await runMiddlewareChain(request, env, middlewares);
    } else if (mapExecutionContext) {
      // Backward compatibility: use legacy context mapper
      context = (await mapExecutionContext(request, env)) as AccumulatedContext<TMiddlewares, TEnv>;
    } else {
      // No context
      context = {} as AccumulatedContext<TMiddlewares, TEnv>;
    }

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
async function mapWorkerProxyRequest<TController extends ExecutableController>(
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
