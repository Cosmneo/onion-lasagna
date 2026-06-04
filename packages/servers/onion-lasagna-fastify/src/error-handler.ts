/**
 * @fileoverview Error handler for Fastify framework.
 *
 * Maps onion-lasagna error hierarchy to appropriate HTTP responses.
 *
 * @module http/frameworks/fastify/error-handler
 */

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { mapErrorToHttpResponse } from '@cosmneo/onion-lasagna/http/shared';
import type { MappedErrorResponse } from '@cosmneo/onion-lasagna/http/shared';
import { InvalidRequestError } from '@cosmneo/onion-lasagna';

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
 * Normalizes a Fastify body-parse error into an `InvalidRequestError` so it
 * maps to 400 instead of 500.  Fastify emits a FastifyError with statusCode
 * 400 and code 'FST_ERR_CTP_INVALID_CONTENT_LENGTH' / 'FST_ERR_CTP_EMPTY_JSON_BODY'
 * or a generic SyntaxError for malformed JSON bodies.
 */
function normalizeBodyParseError(error: FastifyError): unknown {
  // FastifyError exposes .statusCode and .code directly on the type
  const statusCode = error.statusCode;
  const code = error.code;
  // Fastify body-parser errors: statusCode 400 with FST_ERR_CTP_* codes
  if (statusCode === 400 && typeof code === 'string' && code.startsWith('FST_ERR_CTP')) {
    return new InvalidRequestError({
      message: 'Invalid JSON in request body',
      cause: error,
      validationErrors: [{ field: 'body', message: error.message }],
    });
  }
  // Fallback: statusCode 400 with JSON-related message (catches wrapped SyntaxError)
  if (
    statusCode === 400 &&
    (error.cause instanceof SyntaxError ||
      error instanceof SyntaxError ||
      error.message.toLowerCase().includes('json'))
  ) {
    return new InvalidRequestError({
      message: 'Invalid JSON in request body',
      cause: error,
      validationErrors: [{ field: 'body', message: error.message }],
    });
  }
  return error;
}

/**
 * Global error handler for Fastify applications using onion-lasagna.
 *
 * Use this as the error handler for your Fastify app:
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import { onionErrorHandler } from '@cosmneo/onion-lasagna-fastify';
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
  const { status, body } = mapErrorToResponse(normalizeBodyParseError(error));
  void reply.status(status).send(body);
}
