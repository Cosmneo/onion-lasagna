/**
 * @fileoverview Error handler for Hono framework.
 *
 * Maps onion-lasagna error hierarchy to appropriate HTTP responses.
 *
 * @module http/frameworks/hono/error-handler
 */

import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { mapErrorToHttpResponse } from '@cosmneo/onion-lasagna/http/shared';
import type { ErrorResponseBody, MappedErrorResponse } from '@cosmneo/onion-lasagna/http/shared';

/**
 * Maps an error to a status code and response body.
 *
 * This provides the same API as other framework adapters (Elysia, Express,
 * Fastify) for consistent cross-framework usage.
 *
 * @param error - The error to map
 * @returns Mapped error response with status and body
 */
export function mapErrorToResponse(error: unknown): MappedErrorResponse {
  return mapErrorToHttpResponse(error);
}

/**
 * Creates a JSON response for errors.
 */
function createErrorResponse(status: number, body: ErrorResponseBody): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Maps an error to a Hono HTTPException.
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
 * @returns Hono HTTPException
 */
export function mapErrorToHttpException(error: unknown): HTTPException {
  // Already an HTTPException - return as-is
  if (error instanceof HTTPException) {
    return error;
  }

  const { status, body } = mapErrorToHttpResponse(error);

  // Cast to ContentfulStatusCode - all error status codes (4xx, 5xx) are contentful
  return new HTTPException(status as ContentfulStatusCode, {
    res: createErrorResponse(status, body),
    cause: error,
  });
}

/**
 * Global error handler for Hono applications using onion-lasagna.
 *
 * Use this as the error handler for your Hono app:
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { onionErrorHandler } from '@cosmneo/onion-lasagna-hono';
 *
 * const app = new Hono();
 * app.onError(onionErrorHandler);
 * ```
 */
export const onionErrorHandler: ErrorHandler = (err: Error) => {
  const exception = mapErrorToHttpException(err);
  return exception.getResponse();
};
