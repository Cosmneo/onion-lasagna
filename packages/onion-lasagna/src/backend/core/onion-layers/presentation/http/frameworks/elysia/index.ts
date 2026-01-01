/**
 * @fileoverview Elysia framework adapter for onion-lasagna HTTP routes.
 *
 * @module http/frameworks/elysia
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { registerElysiaRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/elysia';
 * import { createServerRoutes } from '@cosmneo/onion-lasagna/http/server';
 *
 * const app = new Elysia()
 *   .onError(onionErrorHandler);
 *
 * const routes = createServerRoutes(router, handlers);
 * registerElysiaRoutes(app, routes);
 *
 * app.listen(3000);
 * ```
 */

export { registerElysiaRoutes } from './register-routes';
export { onionErrorHandler, mapErrorToResponse } from './error-handler';
export type {
  RegisterElysiaRoutesOptions,
  ElysiaMiddleware,
  ElysiaContext,
  ElysiaContextExtractor,
  ErrorResponseBody,
  ErrorItem,
  MappedErrorResponse,
} from './types';
