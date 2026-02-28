/**
 * @fileoverview Error handler for Elysia framework.
 *
 * Maps onion-lasagna error hierarchy to appropriate HTTP responses.
 *
 * @module http/frameworks/elysia/error-handler
 */

import { mapErrorToHttpResponse } from '@cosmneo/onion-lasagna/http/shared';
import type { MappedErrorResponse } from '@cosmneo/onion-lasagna/http/shared';

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
 * Global error handler for Elysia applications using onion-lasagna.
 *
 * Use this as the error handler for your Elysia app:
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { onionErrorHandler } from '@cosmneo/onion-lasagna-elysia';
 *
 * const app = new Elysia()
 *   .onError(onionErrorHandler);
 * ```
 */
export function onionErrorHandler({ error }: { error: unknown }): Response {
  const { status, body } = mapErrorToResponse(error);

  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
