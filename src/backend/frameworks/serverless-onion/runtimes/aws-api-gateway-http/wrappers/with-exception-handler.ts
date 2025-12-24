import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { createExceptionHandler } from '../../../core';
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
export const withExceptionHandler = createExceptionHandler<APIGatewayProxyResultV2>({
  mapExceptionToResponse: (exception) =>
    mapResponse({
      statusCode: exception.statusCode,
      body: exception.toResponse(),
    }),
});
