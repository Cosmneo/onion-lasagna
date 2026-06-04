/**
 * @fileoverview Error handler for Express framework.
 *
 * Maps onion-lasagna error hierarchy to appropriate HTTP responses.
 *
 * @module http/frameworks/express/error-handler
 */

import type { Request, Response, NextFunction } from 'express';
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
 * Normalizes a body-parser / framework JSON parse error (SyntaxError) into an
 * `InvalidRequestError` so it maps to 400 instead of 500.
 */
function normalizeBodyParseError(err: unknown): unknown {
  if (err instanceof SyntaxError) {
    // body-parser decorates SyntaxError with `body` and `status` properties
    const errObj = err as unknown as Record<string, unknown>;
    if ('body' in errObj && 'status' in errObj && errObj['status'] === 400) {
      return new InvalidRequestError({
        message: 'Invalid JSON in request body',
        cause: err,
        validationErrors: [{ field: 'body', message: err.message }],
      });
    }
  }
  return err;
}

/**
 * Express error-handling middleware for onion-lasagna.
 *
 * Must be registered AFTER all routes to catch errors:
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { registerExpressRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna-express';
 *
 * const app = express();
 * registerExpressRoutes(app, routes);
 * app.use(onionErrorHandler); // Must be last
 * ```
 */
export function onionErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const { status, body } = mapErrorToResponse(normalizeBodyParseError(err));
  res.status(status).json(body);
}
