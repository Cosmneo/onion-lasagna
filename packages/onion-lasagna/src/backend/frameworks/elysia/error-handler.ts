import { mapErrorToResponse } from './map-error-to-response';

/**
 * Elysia error handler that maps domain errors to HTTP responses.
 *
 * Apply this to your Elysia app using `.onError()` to automatically
 * convert domain/use-case errors to appropriate HTTP responses.
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { registerElysiaRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/backend/frameworks/elysia';
 *
 * const app = new Elysia()
 *   .onError(onionErrorHandler)
 *   .get('/health', () => ({ status: 'ok' }));
 *
 * registerElysiaRoutes(app, routes);
 *
 * export default app;
 * ```
 *
 * @example With custom error logging
 * ```typescript
 * const app = new Elysia()
 *   .onError(({ error, code, ...context }) => {
 *     // Log the error
 *     console.error('Error occurred:', error);
 *
 *     // Use the onion error handler
 *     return onionErrorHandler({ error, code, ...context });
 *   });
 * ```
 */
export function onionErrorHandler({ error }: { error: unknown }): Response {
  const { statusCode, body } = mapErrorToResponse(error);

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}
