/**
 * @fileoverview Error handler for Fastify framework.
 *
 * Maps onion-lasagna error hierarchy to appropriate HTTP responses.
 *
 * @module http/frameworks/fastify/error-handler
 */

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { mapErrorToHttpResponse } from '../../shared/error-mapping';
import type { MappedErrorResponse } from '../../shared/types';

/**
 * Maps an error to a status code and response body.
 *
 * Mapping strategy:
 * - `ObjectValidationError` → 400 Bad Request (with field errors)
 * - `InvalidRequestError` → 400 Bad Request (with field errors)
 * - `UseCaseError` → 400 Bad Request
 * - `AccessDeniedError` → 403 Forbidden
 * - `NotFoundError` → 404 Not Found
 * - `ConflictError` → 409 Conflict
 * - `UnprocessableError` → 422 Unprocessable Entity
 * - `DomainError` → 500 Internal Server Error (masked)
 * - `InfraError` → 500 Internal Server Error (masked)
 * - `ControllerError` → 500 Internal Server Error (masked)
 * - Unknown → 500 Internal Server Error (masked)
 *
 * @param error - The error to map
 * @returns Mapped error response
 */
export function mapErrorToResponse(error: unknown): MappedErrorResponse {
  return mapErrorToHttpResponse(error);
}

/**
 * Global error handler for Fastify applications using onion-lasagna.
 *
 * Use this as the error handler for your Fastify app:
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import { onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/fastify';
 *
 * const app = Fastify();
 * app.setErrorHandler(onionErrorHandler);
 * ```
 */
export function onionErrorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  const { status, body } = mapErrorToResponse(error);
  void reply.status(status).send(body);
}
