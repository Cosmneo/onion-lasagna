/**
 * @fileoverview Hono framework adapter for onion-lasagna HTTP routes.
 *
 * @module http/frameworks/hono
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { registerHonoRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/hono';
 * import { createServerRoutes } from '@cosmneo/onion-lasagna/http/server';
 *
 * const app = new Hono();
 * app.onError(onionErrorHandler);
 *
 * const routes = createServerRoutes(router, handlers);
 * registerHonoRoutes(app, routes);
 *
 * export default app;
 * ```
 */

export { registerHonoRoutes } from './register-routes';
export { onionErrorHandler, mapErrorToHttpException } from './error-handler';
export type {
  HonoLike,
  RegisterHonoRoutesOptions,
  HonoContextExtractor,
  ErrorResponseBody,
  ErrorItem,
} from './types';
