import { HttpException, InternalServerErrorException } from '../exceptions';
import { mapErrorToException } from '../mappers/errors';
import { mapResponse } from '../mappers/response';
import type { WorkerEnv, WorkerHandler } from '../types/worker-handler.type';

/**
 * Wraps a Worker handler with centralized exception handling.
 *
 * This middleware provides a global error boundary that:
 * - Catches all thrown exceptions (including from middlewares and controllers)
 * - Maps framework errors to appropriate HTTP status codes using `mapErrorToException`
 * - Returns structured JSON error responses
 * - Masks internal server errors to avoid leaking implementation details
 * - Logs internal server errors for debugging
 *
 * @typeParam TEnv - Cloudflare Worker environment bindings
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
export function withExceptionHandler<TEnv extends WorkerEnv>(
  handler: WorkerHandler<TEnv>,
): WorkerHandler<TEnv> {
  return async (request, env, ctx) => {
    try {
      return await handler(request, env, ctx);
    } catch (error: unknown) {
      // Already an HttpException - return its response
      if (error instanceof HttpException) {
        // Log internal server errors for debugging
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
