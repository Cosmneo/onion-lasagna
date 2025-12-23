import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import type { HttpResponse } from '../../../core/bounded-context/presentation/interfaces/types/http-response';
import { NotFoundException } from '../exceptions';
import { mapRequestBody, mapRequestHeaders, mapRequestQueryParams } from '../mappers/request';
import { mapResponse } from '../mappers/response';
import { withExceptionHandler } from '../middlewares/with-exception-handler.middleware';
import type { ExecutableController, ResolvedRoute, RouteInput } from '../routing/types';
import { createRoutingMap } from '../routing/create-routing-map';
import { getWarmupResponse, isWarmupCall } from '../warmup';

/**
 * Request metadata extracted from the API Gateway event.
 */
export interface RequestMetadata {
  path: string;
  method: string;
  requestId: string;
  sourceIp: string;
  userAgent: string;
}

/**
 * Configuration for the greedy-proxy service handler.
 */
export interface CreateGreedyProxyHandlerConfig<
  TController extends ExecutableController = ExecutableController,
  TContext = unknown,
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
   * Maps the API Gateway event to an execution context.
   * Common use case: extract authorizer context.
   * @default () => ({})
   */
  mapExecutionContext?: (event: APIGatewayProxyEventV2) => TContext;

  /**
   * Whether to handle warmup calls from serverless-plugin-warmup.
   * @default true
   */
  handleWarmup?: boolean;

  /**
   * Whether to wrap the handler with exception handling middleware.
   * @default true
   */
  handleExceptions?: boolean;
}

/**
 * Creates an AWS API Gateway v2 handler for greedy-proxy routes (`/{proxy+}`).
 *
 * This factory creates a multi-route handler that:
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
 * // Define your controllers
 * const createUserController = { execute: async (input) => { ... } };
 * const findUserController = { execute: async (input) => { ... } };
 *
 * // Create the greedy proxy handler
 * export const handler = createGreedyProxyHandler({
 *   serviceName: 'UserService',
 *   routes: [
 *     { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
 *     { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: findUserController },
 *   ],
 *   mapExecutionContext: (event) => event.requestContext.authorizer?.lambda ?? {},
 * });
 * ```
 */
export function createGreedyProxyHandler<
  TController extends ExecutableController = ExecutableController,
  TContext = unknown,
>(config: CreateGreedyProxyHandlerConfig<TController, TContext>): APIGatewayProxyHandlerV2 {
  const {
    serviceName,
    routes,
    mapExecutionContext = () => ({}) as TContext,
    handleWarmup = true,
    handleExceptions = true,
  } = config;

  // Create routing map
  const { resolveRoute } = createRoutingMap(routes);

  const coreHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // Handle warmup
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

    // Build controller input
    const controllerInput = {
      metadata: requestMetadata,
      context: mapExecutionContext(event),
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
function mapGreedyProxyRequest<TController extends ExecutableController>(
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
