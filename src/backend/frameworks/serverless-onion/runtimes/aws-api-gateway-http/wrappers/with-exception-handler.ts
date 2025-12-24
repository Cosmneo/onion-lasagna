import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';
import { HttpException, InternalServerErrorException, mapErrorToException } from '../../../core';
import { mapResponse } from '../adapters/response';

/**
 * Wraps a Lambda handler to catch exceptions and convert them to structured HTTP responses.
 *
 * This wrapper provides centralized error handling for API Gateway HTTP v2 handlers:
 * - Catches all thrown exceptions
 * - Maps framework errors (`DomainError`, `UseCaseError`, etc.) to HTTP status codes
 * - Returns structured JSON error responses
 * - Masks internal server errors to avoid leaking implementation details
 *
 * @param handler - The Lambda handler function to wrap
 * @returns A wrapped handler with exception handling
 *
 * @example
 * ```typescript
 * const rawHandler = async (event: APIGatewayProxyEventV2) => {
 *   const result = await useCase.execute(input);
 *   return mapResponse({ statusCode: 200, body: result });
 * };
 *
 * export const handler = withExceptionHandler(rawHandler);
 * ```
 */
export function withExceptionHandler(handler: APIGatewayProxyHandlerV2): APIGatewayProxyHandlerV2 {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<APIGatewayProxyResultV2> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const result = await handler(event, context, () => {});
      return result ?? { statusCode: 204, body: '' };
    } catch (error: unknown) {
      // Already an HttpException - return it (with masking for 500s)
      if (error instanceof HttpException) {
        if (error instanceof InternalServerErrorException) {
          console.error('[InternalServerError]', error);
        }
        return mapResponse({
          statusCode: error.statusCode,
          body: error.toResponse(),
        });
      }

      // Map framework errors to HTTP exceptions
      const httpException = mapErrorToException(error);

      return mapResponse({
        statusCode: httpException.statusCode,
        body: httpException.toResponse(),
      });
    }
  };
}
