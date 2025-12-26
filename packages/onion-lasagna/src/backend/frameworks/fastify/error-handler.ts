import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { mapErrorToResponse } from './map-error-to-response';

/**
 * Fastify error handler that maps domain errors to HTTP responses.
 *
 * Apply this to your Fastify app using `setErrorHandler()` to automatically
 * convert domain/use-case errors to appropriate HTTP responses.
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import { registerFastifyRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/backend/frameworks/fastify';
 *
 * const app = Fastify();
 *
 * // Apply error handler
 * app.setErrorHandler(onionErrorHandler);
 *
 * // Register routes
 * registerFastifyRoutes(app, routes);
 *
 * await app.listen({ port: 3000 });
 * ```
 *
 * @example With custom error logging
 * ```typescript
 * app.setErrorHandler((error, request, reply) => {
 *   // Log the error
 *   request.log.error(error);
 *
 *   // Use the onion error handler
 *   return onionErrorHandler(error, request, reply);
 * });
 * ```
 */
export function onionErrorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  const { statusCode, body } = mapErrorToResponse(error);

  return reply.status(statusCode).send(body);
}
