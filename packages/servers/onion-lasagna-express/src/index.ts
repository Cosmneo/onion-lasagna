/**
 * @fileoverview Express framework adapter for onion-lasagna HTTP routes.
 *
 * @module http/frameworks/express
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { registerExpressRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna-express';
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 *
 * const app = express();
 * app.use(express.json());
 *
 * const routes = serverRoutes(router)
 *   .handle('...', { requestMapper, useCase, responseMapper })
 *   .build();
 * registerExpressRoutes(app, routes, { prefix: '/api/v1' });
 *
 * app.use(onionErrorHandler);
 * app.listen(3000);
 * ```
 */

export { registerExpressRoutes } from './register-routes';
export { onionErrorHandler, mapErrorToResponse } from './error-handler';
export type {
  ExpressContextExtractor,
  RegisterExpressRoutesOptions,
  ErrorResponseBody,
  ErrorItem,
  MappedErrorResponse,
} from './types';
