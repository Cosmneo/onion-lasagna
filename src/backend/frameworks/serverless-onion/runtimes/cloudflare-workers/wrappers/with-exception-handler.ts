import { createExceptionHandler } from '../../../core';
import { mapResponse } from '../adapters/response';

/**
 * Wraps a Worker handler with centralized exception handling.
 *
 * This wrapper provides a global error boundary that:
 * - Catches all thrown exceptions (including from middlewares and controllers)
 * - Maps framework errors to appropriate HTTP status codes using `mapErrorToException`
 * - Returns structured JSON error responses
 * - Masks internal server errors to avoid leaking implementation details
 * - Logs internal server errors for debugging
 *
 * @param handler - The Worker handler to wrap
 * @returns A wrapped handler with exception handling
 *
 * @example
 * ```typescript
 * const rawHandler: WorkerHandler<Env> = async (request, env, ctx) => {
 *   // May throw errors from middlewares or controllers
 *   const result = await useCase.execute(input);
 *   return mapResponse({ statusCode: 200, body: result });
 * };
 *
 * // Wrap with exception handler
 * export default {
 *   fetch: withExceptionHandler(rawHandler),
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Exceptions are automatically converted to HTTP responses:
 * // - UnauthorizedException → 401 Unauthorized
 * // - ForbiddenException → 403 Forbidden
 * // - NotFoundException → 404 Not Found
 * // - BadRequestException → 400 Bad Request
 * // - ConflictException → 409 Conflict
 * // - UnprocessableEntityException → 422 Unprocessable Entity
 * // - InternalServerErrorException → 500 Internal Server Error (masked)
 * ```
 */
export const withExceptionHandler = createExceptionHandler<Response>({
  mapExceptionToResponse: (exception) =>
    mapResponse({
      statusCode: exception.statusCode,
      body: exception.toResponse(),
    }),
});
