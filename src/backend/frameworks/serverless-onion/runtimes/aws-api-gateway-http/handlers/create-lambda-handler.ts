import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import type { Controller } from '../../../../../core/onion-layers/presentation/interfaces/types/controller.type';
import type { HttpResponse } from '../../../../../core/onion-layers/presentation/interfaces/types/http';
import {
  createBaseHandler,
  type PlatformAdapter,
  type ResponseMappingOptions,
} from '../../../core/handlers';
import type { ServerlessOnionConfig } from '../../../core/types';
import {
  mapRequest,
  mapRequestBody,
  mapRequestHeaders,
  mapRequestQueryParams,
} from '../adapters/request';
import { mapResponse } from '../adapters/response';
import { getWarmupResponse, isWarmupCall } from '../features/warmup';
import type { AccumulatedContext, AnyMiddleware } from '../middleware';

/**
 * AWS Lambda platform adapter.
 * Provides request extraction and response mapping for API Gateway v2.
 */
const awsAdapter: PlatformAdapter<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = {
  extractBody: (event) => mapRequestBody(event),
  extractHeaders: (event) => mapRequestHeaders(event) ?? {},
  extractQueryParams: (event) => mapRequestQueryParams(event) ?? {},
  extractOrigin: (event) => event.headers?.['origin'],
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
 * Configuration for creating a Lambda handler.
 */
export interface CreateLambdaHandlerConfig<
  TInput,
  TOutput,
  TMiddlewares extends readonly AnyMiddleware<TEnv>[] = readonly [],
  TEnv = undefined,
> {
  /**
   * The controller that handles the request.
   * Must implement {@link Controller}.
   */
  controller: Controller<TInput, TOutput>;

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
   * createLambdaHandler({
   *   controller: myController,
   *   env: { db: myDatabase, config: myConfig },
   *   middlewares: [
   *     defineMiddleware<DataContext, object, Deps>()(async (event, env) => {
   *       const data = await env.db.query('...');
   *       return { data };
   *     }),
   *   ] as const,
   *   mapInput: (event, env, ctx) => ({ ...mapRequest(event), data: ctx.data }),
   * });
   * ```
   */
  env?: TEnv;

  /**
   * Middlewares to run before the controller.
   *
   * Executed in order; each middleware can depend on context from previous ones.
   * The accumulated context is passed to `mapInput` for use in building controller input.
   *
   * @example
   * ```typescript
   * middlewares: [authMiddleware, tenantMiddleware] as const,
   * mapInput: (event, env, middlewareContext) => ({
   *   ...mapRequest(event),
   *   userId: middlewareContext.userId,
   *   tenantId: middlewareContext.tenantId,
   * }),
   * ```
   */
  middlewares?: TMiddlewares;

  /**
   * Maps the API Gateway event to controller input.
   *
   * When middlewares are used, receives the accumulated context as the 3rd parameter.
   *
   * @default Uses mapRequest to create HttpRequest
   */
  mapInput?: (
    event: APIGatewayProxyEventV2,
    env: TEnv,
    middlewareContext: AccumulatedContext<TMiddlewares, TEnv>,
  ) => TInput | Promise<TInput>;

  /**
   * Optional function to map the controller output to an HttpResponse.
   * If not provided, assumes the controller returns an HttpResponse.
   */
  mapOutput?: (output: TOutput) => HttpResponse;

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

  /**
   * Framework configuration including CORS and other settings.
   *
   * @example Configure CORS
   * ```typescript
   * createLambdaHandler({
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
   * createLambdaHandler({
   *   controller: myController,
   *   config: { cors: false },
   * });
   * ```
   */
  config?: ServerlessOnionConfig;
}

/**
 * Creates an AWS API Gateway v2 Lambda handler from a controller.
 *
 * This factory provides a clean way to wire up controllers to Lambda functions
 * with automatic request/response mapping, warmup handling, middleware support,
 * and error handling.
 *
 * @param config - Handler configuration
 * @returns API Gateway Lambda handler function
 *
 * @example
 * ```typescript
 * // Simple usage with default mapping
 * const handler = createLambdaHandler({
 *   controller: myController,
 * });
 *
 * // With middleware chain (like Cloudflare Workers)
 * const authMiddleware = defineMiddleware<AuthContext>()(async (event) => {
 *   const token = event.headers?.authorization;
 *   if (!token) throw new UnauthorizedException({ message: 'No token', code: 'NO_TOKEN' });
 *   return { userId: await validateToken(token) };
 * });
 *
 * const handler = createLambdaHandler({
 *   controller: myController,
 *   middlewares: [authMiddleware] as const,
 *   mapInput: (event, env, ctx) => ({
 *     ...mapRequest(event),
 *     userId: ctx.userId, // Type-safe!
 *   }),
 * });
 *
 * // With custom output mapping
 * const handler = createLambdaHandler({
 *   controller: myController,
 *   mapOutput: (result) => ({
 *     statusCode: 201,
 *     body: result,
 *     headers: { 'Location': `/users/${result.id}` },
 *   }),
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With injected dependencies
 * interface Deps { db: Database; }
 *
 * const handler = createLambdaHandler({
 *   controller: myController,
 *   env: { db: myDatabase },
 *   middlewares: [
 *     defineMiddleware<DataContext, object, Deps>()(async (event, env) => {
 *       return { users: await env.db.listUsers() };
 *     }),
 *   ] as const,
 *   mapInput: (event, env, ctx) => ({
 *     ...mapRequest(event),
 *     users: ctx.users,
 *   }),
 * });
 * ```
 */
export function createLambdaHandler<
  TInput,
  TOutput,
  TMiddlewares extends readonly AnyMiddleware<TEnv>[] = readonly [],
  TEnv = undefined,
>(
  handlerConfig: CreateLambdaHandlerConfig<TInput, TOutput, TMiddlewares, TEnv>,
): APIGatewayProxyHandlerV2 {
  const {
    controller,
    env,
    middlewares = [] as unknown as TMiddlewares,
    mapInput = (event: APIGatewayProxyEventV2) => mapRequest(event) as TInput,
    mapOutput = (output: TOutput) => output as unknown as HttpResponse,
    handleWarmup = true,
    handleExceptions = true,
    config,
  } = handlerConfig;

  // Create base handler using the core factory
  const baseHandlerFactory = createBaseHandler<
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    TEnv
  >(awsAdapter);

  const baseHandler = baseHandlerFactory({
    controller,
    middlewares,
    mapInput,
    mapOutput,
    handleExceptions,
    config,
  });

  // Wrap with warmup handling
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // Handle warmup BEFORE any other logic (avoid unnecessary auth calls)
    if (handleWarmup && isWarmupCall(event)) {
      console.info('Lambda is warm!');
      return getWarmupResponse();
    }

    return baseHandler(event, env as TEnv);
  };
}
