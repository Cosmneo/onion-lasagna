import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import type { HttpResponse } from '../../../core/bounded-context/presentation/interfaces/types/http-response';
import { mapRequest } from '../mappers/request';
import { mapResponse } from '../mappers/response';
import { withExceptionHandler } from '../middlewares/with-exception-handler.middleware';
import { getWarmupResponse, isWarmupCall } from '../warmup';

/**
 * Controller interface for Lambda handlers.
 */
export interface LambdaController<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

/**
 * Configuration for creating a Lambda handler.
 */
export interface CreateLambdaHandlerConfig<TInput, TOutput> {
  /**
   * The controller that handles the request.
   */
  controller: LambdaController<TInput, TOutput>;

  /**
   * Optional function to map the API Gateway event to controller input.
   * If not provided, uses the default mapRequest function.
   */
  mapInput?: (event: APIGatewayProxyEventV2) => TInput;

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
   * Whether to wrap the handler with exception handling middleware.
   * @default true
   */
  handleExceptions?: boolean;
}

/**
 * Creates an AWS API Gateway v2 Lambda handler from a controller.
 *
 * This factory provides a clean way to wire up controllers to Lambda functions
 * with automatic request/response mapping, warmup handling, and error handling.
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
 * // With custom input mapping
 * const handler = createLambdaHandler({
 *   controller: myController,
 *   mapInput: (event) => ({
 *     ...mapRequest(event),
 *     context: event.requestContext.authorizer?.lambda,
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
 */
export function createLambdaHandler<TInput, TOutput>(
  config: CreateLambdaHandlerConfig<TInput, TOutput>,
): APIGatewayProxyHandlerV2 {
  const {
    controller,
    mapInput = (event) => mapRequest(event) as TInput,
    mapOutput = (output) => output as unknown as HttpResponse,
    handleWarmup = true,
    handleExceptions = true,
  } = config;

  const coreHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // Handle warmup
    if (handleWarmup && isWarmupCall(event)) {
      console.info('Lambda is warm!');
      return getWarmupResponse();
    }

    // Map input
    const input = mapInput(event);

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
