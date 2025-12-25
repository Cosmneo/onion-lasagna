import { HttpException, InternalServerErrorException } from '../exceptions';
import type { ResponseMappingOptions } from '../handlers/types';
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
   * @param options - CORS and other response mapping options
   * @returns The platform-specific response
   */
  mapExceptionToResponse: (exception: HttpException, options?: ResponseMappingOptions) => TResponse;

  /**
   * Response mapping options to pass to mapExceptionToResponse.
   * Typically includes CORS configuration.
   */
  responseOptions?: ResponseMappingOptions;
}

/**
 * Logs an internal server error with its original error type for debugging.
 *
 * Extracts the original error from the exception's cause chain to preserve
 * the error type context (e.g., DomainError, InfraError) in log output.
 *
 * @param exception - The InternalServerErrorException to log
 */
function logInternalError(exception: InternalServerErrorException): void {
  const cause = exception.cause;

  if (cause) {
    // Log with original error type for better debugging context
    const errorType = cause.constructor?.name ?? 'UnknownError';
    console.error(`[${errorType}]`, cause);
  } else {
    // No cause available, log the exception itself
    console.error('[InternalServerError]', exception);
  }
}

/**
 * Creates a wrapper function that adds exception handling to any async handler.
 *
 * This factory creates a higher-order function that:
 * - Catches all thrown exceptions
 * - Maps framework errors to HTTP exceptions using `mapErrorToException`
 * - Logs internal server errors for debugging (with original error type preserved)
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
  const { mapExceptionToResponse, responseOptions } = config;

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
            logInternalError(error);
          }
          return mapExceptionToResponse(error, responseOptions);
        }

        // Map framework errors to HTTP exceptions
        const httpException = mapErrorToException(error);

        // Log if it resulted in an internal server error
        if (httpException instanceof InternalServerErrorException) {
          logInternalError(httpException);
        }

        return mapExceptionToResponse(httpException, responseOptions);
      }
    };

    return wrappedHandler as THandler;
  };
}
