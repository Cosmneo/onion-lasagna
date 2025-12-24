import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import type { Controller } from '../../../../../core/bounded-context/presentation/interfaces/types/controller.type';
import type { HttpResponse } from '../../../../../core/bounded-context/presentation/interfaces/types/http';
import { runMiddlewareChain } from '../../../core';
import { mapRequest } from '../adapters/request';
import { mapResponse } from '../adapters/response';
import { getWarmupResponse, isWarmupCall } from '../features/warmup';
import type { AccumulatedContext, Middleware } from '../middleware';
import { withExceptionHandler } from '../wrappers/with-exception-handler';

/**
 * Configuration for creating a Lambda handler.
 */
export interface CreateLambdaHandlerConfig<
  TInput,
  TOutput,
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
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
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
  TEnv = undefined,
>(
  config: CreateLambdaHandlerConfig<TInput, TOutput, TMiddlewares, TEnv>,
): APIGatewayProxyHandlerV2 {
  const {
    controller,
    env,
    middlewares = [] as unknown as TMiddlewares,
    mapInput = (event: APIGatewayProxyEventV2) => mapRequest(event) as TInput,
    mapOutput = (output: TOutput) => output as unknown as HttpResponse,
    handleWarmup = true,
    handleExceptions = true,
  } = config;

  const coreHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // Handle warmup BEFORE middleware (avoid unnecessary auth calls)
    if (handleWarmup && isWarmupCall(event)) {
      console.info('Lambda is warm!');
      return getWarmupResponse();
    }

    // Run middleware chain
    let middlewareContext: AccumulatedContext<TMiddlewares, TEnv>;
    if (middlewares.length > 0) {
      middlewareContext = await runMiddlewareChain(event, env as TEnv, middlewares);
    } else {
      middlewareContext = {} as AccumulatedContext<TMiddlewares, TEnv>;
    }

    // Map input (now receives middleware context)
    const input = await mapInput(event, env as TEnv, middlewareContext);

    // Execute controller
    const output = await controller.execute(input);

    // Map output to response
    const httpResponse = mapOutput(output);

    return mapResponse(httpResponse);
  };

  // Wrap with exception handler if enabled
  if (handleExceptions) {
    return withExceptionHandler(coreHandler);
  }

  return coreHandler;
}
