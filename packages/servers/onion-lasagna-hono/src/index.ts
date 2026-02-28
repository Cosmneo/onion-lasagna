/**
 * @fileoverview Hono framework adapter for onion-lasagna HTTP routes.
 *
 * @module http/frameworks/hono
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { registerHonoRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna-hono';
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 *
 * const app = new Hono();
 * app.onError(onionErrorHandler);
 *
 * const routes = serverRoutes(router)
 *   .handle('...', { requestMapper, useCase, responseMapper })
 *   .build();
 * registerHonoRoutes(app, routes);
 *
 * export default app;
 * ```
 */

export { registerHonoRoutes } from './register-routes';
export { onionErrorHandler, mapErrorToResponse } from './error-handler';
export type {
  HonoLike,
  RegisterHonoRoutesOptions,
  HonoContextExtractor,
  ErrorResponseBody,
  ErrorItem,
  MappedErrorResponse,
} from './types';
