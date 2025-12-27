import type { Context } from 'hono';
import type { HTTPException } from 'hono/http-exception';
import { mapErrorToHttpException } from './map-error-to-http-exception';

/**
 * Hono error handler that maps domain errors to HTTP responses.
 *
 * Apply this to your Hono app using `app.onError()` to automatically
 * convert domain/use-case errors to appropriate HTTP responses.
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { registerHonoRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/backend/frameworks/hono';
 *
 * const app = new Hono();
 *
 * // Apply error handler
 * app.onError(onionErrorHandler);
 *
 * // Register routes
 * registerHonoRoutes(app, routes);
 *
 * export default app;
 * ```
 */
export function onionErrorHandler(error: Error | HTTPException, _c: Context): Response {
  const httpException = mapErrorToHttpException(error);
  return httpException.getResponse();
}
