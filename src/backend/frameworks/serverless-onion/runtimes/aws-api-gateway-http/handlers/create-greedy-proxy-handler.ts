import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
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
import { mapRequestBody, mapRequestHeaders, mapRequestQueryParams } from '../adapters/request';
import { mapResponse } from '../adapters/response';
import { getWarmupResponse, isWarmupCall } from '../features/warmup';
import type { AccumulatedContext, Middleware } from '../middleware';
import { withExceptionHandler } from '../wrappers/with-exception-handler';

/**
 * Request metadata extracted from the API Gateway event.
 *
 * Extends {@link BaseRequestMetadata} with AWS-specific fields.
 */
export interface RequestMetadata extends BaseRequestMetadata {
  /**
   * The AWS request ID for tracing.
   */
  requestId: string;

  /**
   * The source IP address of the client.
   */
  sourceIp: string;

  /**
   * The User-Agent header from the client.
   */
  userAgent: string;
}

/**
 * Configuration for the greedy-proxy service handler.
 */
export interface CreateGreedyProxyHandlerConfig<
  TController extends Controller = Controller,
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
  TEnv = undefined,
  TAuthorizerContext extends object = object,
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
   * Environment/dependencies to inject into middlewares.
   *
   * Unlike Cloudflare Workers, AWS Lambda doesn't have built-in environment
   * bindings. Use this option to inject dependencies (database clients, caches,
   * configuration, etc.) that your middlewares need.
   *
   * @default undefined
   *
   * @example
   * ```typescript
   * interface Deps { db: Database; config: Config; }
   *
   * createGreedyProxyHandler({
   *   env: { db: myDatabase, config: myConfig },
   *   middlewares: [
   *     defineMiddleware<DataContext, object, Deps>()(async (event, env) => {
   *       const data = await env.db.query('...');
   *       return { data };
   *     }),
   *   ] as const,
   *   ...
   * });
   * ```
   */
  env?: TEnv;

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
   * const authMiddleware = defineMiddleware<AuthContext>()(async (event) => {
   *   const token = event.headers?.authorization;
   *   if (!token) throw new UnauthorizedException({ message: 'No token', code: 'NO_TOKEN' });
   *   return { userId: await validateToken(token) };
   * });
   *
   * const tenantMiddleware = defineMiddleware<TenantContext, AuthContext>()(async (event, env, ctx) => {
   *   const tenant = await getTenant(ctx.userId);
   *   return { tenantId: tenant.id };
   * });
   *
   * createGreedyProxyHandler({
   *   serviceName: 'UserService',
   *   routes: [...],
   *   middlewares: [authMiddleware, tenantMiddleware] as const,
   *   // Controller receives context: AuthContext & TenantContext
   * });
   * ```
   */
  middlewares?: TMiddlewares;

  /**
   * Extracts context from a Lambda authorizer response.
   *
   * This runs BEFORE the middleware chain, allowing middlewares to depend on
   * the authorizer context. Use this for cached authentication data from
   * API Gateway's Lambda authorizer.
   *
   * @example
   * ```typescript
   * // Authorizer context is available in middlewares
   * createGreedyProxyHandler({
   *   extractAuthorizerContext: (event) => ({
   *     userId: event.requestContext.authorizer?.lambda?.userId,
   *   }),
   *   middlewares: [
   *     defineMiddleware<TenantContext, { userId: string }>()(async (event, env, ctx) => {
   *       // ctx.userId comes from authorizer!
   *       const tenant = await getTenant(ctx.userId);
   *       return { tenantId: tenant.id };
   *     }),
   *   ] as const,
   * });
   * ```
   *
   * @default () => ({})
   */
  extractAuthorizerContext?: (event: APIGatewayProxyEventV2) => TAuthorizerContext;

  /**
   * Whether to handle warmup calls from serverless-plugin-warmup.
   * @default true
   */
  handleWarmup?: boolean;

  /**
   * Whether to wrap the handler with exception handling.
   * @default true
   */
  handleExceptions?: boolean;
}

/**
 * Creates an AWS API Gateway v2 handler for greedy-proxy routes (`/{proxy+}`).
 *
 * This factory creates a multi-route handler that:
 * - Runs middlewares to build execution context (optional)
 * - Routes requests to the appropriate controller based on path and method
 * - Extracts path parameters from route patterns (e.g., `/users/{id}`)
 * - Handles warmup calls from serverless-plugin-warmup
 * - Provides centralized exception handling
 *
 * @param config - Handler configuration
 * @returns API Gateway Lambda handler function
 *
 * @example
 * ```typescript
 * // With middleware chain (recommended)
 * const authMiddleware = defineMiddleware<AuthContext>()(async (event) => {
 *   const token = event.headers?.authorization;
 *   if (!token) throw new UnauthorizedException({ message: 'No token', code: 'NO_TOKEN' });
 *   return { userId: await validateToken(token) };
 * });
 *
 * export const handler = createGreedyProxyHandler({
 *   serviceName: 'UserService',
 *   routes: [
 *     { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
 *     { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserController },
 *   ],
 *   middlewares: [authMiddleware] as const,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Hybrid: authorizer + middleware (middlewares can depend on authorizer context)
 * export const handler = createGreedyProxyHandler({
 *   serviceName: 'UserService',
 *   routes: [...],
 *   // Authorizer context is extracted FIRST
 *   extractAuthorizerContext: (event) => ({
 *     userId: event.requestContext.authorizer?.lambda?.userId,
 *   }),
 *   // Middlewares run AFTER and can depend on authorizer context
 *   middlewares: [
 *     defineMiddleware<{ tenantId: string }, { userId: string }>()(async (event, env, ctx) => {
 *       // ctx.userId comes from authorizer!
 *       const tenant = await getTenant(ctx.userId);
 *       return { tenantId: tenant.id };
 *     }),
 *   ] as const,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Authorizer-only mode
 * export const handler = createGreedyProxyHandler({
 *   serviceName: 'UserService',
 *   routes: [...],
 *   extractAuthorizerContext: (event) => event.requestContext.authorizer?.lambda ?? {},
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With injected dependencies
 * interface Deps { db: Database; }
 *
 * export const handler = createGreedyProxyHandler({
 *   serviceName: 'UserService',
 *   routes: [...],
 *   env: { db: myDatabase },
 *   middlewares: [
 *     defineMiddleware<DataContext, object, Deps>()(async (event, env) => {
 *       return { users: await env.db.listUsers() };
 *     }),
 *   ] as const,
 * });
 * ```
 */
export function createGreedyProxyHandler<
  TController extends Controller = Controller,
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
  TEnv = undefined,
  TAuthorizerContext extends object = object,
>(
  config: CreateGreedyProxyHandlerConfig<TController, TMiddlewares, TEnv, TAuthorizerContext>,
): APIGatewayProxyHandlerV2 {
  const {
    serviceName,
    routes,
    env,
    middlewares = [] as unknown as TMiddlewares,
    extractAuthorizerContext,
    handleWarmup = true,
    handleExceptions = true,
  } = config;

  // Create routing map
  const { resolveRoute } = createRoutingMap(routes);

  const coreHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // Handle warmup BEFORE middleware (avoid unnecessary auth calls)
    if (handleWarmup && isWarmupCall(event)) {
      console.info(`[${serviceName}] Lambda is warm!`);
      return getWarmupResponse();
    }

    // Extract request metadata
    const requestMetadata: RequestMetadata = {
      path: event.rawPath,
      method: event.requestContext.http.method,
      requestId: event.requestContext.requestId,
      sourceIp: event.requestContext.http.sourceIp,
      userAgent: event.requestContext.http.userAgent,
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

    // Build context: authorizer first (so middlewares can depend on it), then middleware chain
    // 1. Extract authorizer context first (if provided)
    const authorizerContext = extractAuthorizerContext?.(event) ?? ({} as TAuthorizerContext);

    // 2. Run middleware chain with authorizer context as initial context
    let context: TAuthorizerContext & AccumulatedContext<TMiddlewares, TEnv>;

    if (middlewares.length > 0) {
      // Middlewares receive authorizer context and can depend on it
      context = await runMiddlewareChain(event, env as TEnv, middlewares, authorizerContext);
    } else {
      // No middlewares, just use authorizer context
      context = authorizerContext as TAuthorizerContext & AccumulatedContext<TMiddlewares, TEnv>;
    }

    // Build controller input
    const controllerInput = {
      metadata: requestMetadata,
      context,
      request: mapGreedyProxyRequest(event, resolved),
    };

    // Execute controller
    const controllerResponse = (await resolved.route.controller.execute(
      controllerInput,
    )) as HttpResponse;

    // Map response to API Gateway format
    return mapResponse(controllerResponse);
  };

  // Wrap with exception handler if enabled
  if (handleExceptions) {
    return withExceptionHandler(coreHandler);
  }

  return coreHandler;
}

/**
 * Maps AWS API Gateway v2 event to HttpRequest format for greedy proxy routes.
 *
 * When using a greedy proxy path (`/{proxy+}`), API Gateway only provides the
 * raw `proxy` path parameter. This function extracts path params from the
 * resolved route pattern and merges them into the request.
 */
function mapGreedyProxyRequest<TController extends Controller>(
  event: APIGatewayProxyEventV2,
  resolved: ResolvedRoute<TController>,
) {
  return {
    body: mapRequestBody(event),
    queryParams: mapRequestQueryParams(event),
    pathParams: resolved.pathParams,
    headers: mapRequestHeaders(event),
  };
}
