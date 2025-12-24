import { HttpException, InternalServerErrorException } from '../exceptions';
import { mapErrorToException } from '../mappers';

/**
 * Configuration for creating an exception handler wrapper.
 *
 * @typeParam TResponse - The response type returned by the handler
 */
export interface ExceptionHandlerConfig<TResponse> {
  /**
   * Converts an HttpException to the platform-specific response format.
   *
   * @param exception - The HTTP exception to convert
   * @returns The platform-specific response
   */
  mapExceptionToResponse: (exception: HttpException) => TResponse;
}

/**
 * Creates a wrapper function that adds exception handling to any async handler.
 *
 * This factory creates a higher-order function that:
 * - Catches all thrown exceptions
 * - Maps framework errors to HTTP exceptions using `mapErrorToException`
 * - Logs internal server errors for debugging
 * - Converts exceptions to the platform-specific response format
 *
 * @typeParam TResponse - The response type returned by the handler
 *
 * @param config - Configuration for exception handling
 * @returns A function that wraps handlers with exception handling
 *
 * @example
 * ```typescript
 * // For Cloudflare Workers
 * const withExceptionHandler = createExceptionHandler<Response>({
 *   mapExceptionToResponse: (exception) => {
 *     return new Response(JSON.stringify(exception.toResponse()), {
 *       status: exception.statusCode,
 *       headers: { 'Content-Type': 'application/json' },
 *     });
 *   },
 * });
 *
 * // Wrap your handler
 * const safeHandler = withExceptionHandler(async (request) => {
 *   // Your handler logic that may throw
 *   return new Response('OK');
 * });
 * ```
 *
 * @example
 * ```typescript
 * // For AWS Lambda
 * const withExceptionHandler = createExceptionHandler<APIGatewayProxyResultV2>({
 *   mapExceptionToResponse: (exception) => ({
 *     statusCode: exception.statusCode,
 *     body: JSON.stringify(exception.toResponse()),
 *     headers: { 'Content-Type': 'application/json' },
 *   }),
 * });
 * ```
 */
export function createExceptionHandler<TResponse>(
  config: ExceptionHandlerConfig<TResponse>,
): <THandler extends (...args: never[]) => Promise<TResponse>>(handler: THandler) => THandler {
  const { mapExceptionToResponse } = config;

  return <THandler extends (...args: never[]) => Promise<TResponse>>(
    handler: THandler,
  ): THandler => {
    const wrappedHandler = async (...args: Parameters<THandler>): Promise<TResponse> => {
      try {
        return await handler(...args);
      } catch (error: unknown) {
        // Already an HttpException - convert to response
        if (error instanceof HttpException) {
          // Log internal server errors for debugging
          if (error instanceof InternalServerErrorException) {
            console.error('[InternalServerError]', error);
          }
          return mapExceptionToResponse(error);
        }

        // Map framework errors to HTTP exceptions
        const httpException = mapErrorToException(error);
        return mapExceptionToResponse(httpException);
      }
    };

    return wrappedHandler as THandler;
  };
}
