/**
 * @fileoverview Fastify framework adapter for onion-lasagna HTTP routes.
 *
 * @module http/frameworks/fastify
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import { registerFastifyRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/fastify';
 * import { createServerRoutes } from '@cosmneo/onion-lasagna/http/server';
 *
 * const app = Fastify();
 * app.setErrorHandler(onionErrorHandler);
 *
 * const routes = createServerRoutes(router, handlers);
 * registerFastifyRoutes(app, routes);
 *
 * await app.listen({ port: 3000 });
 * ```
 */

export { registerFastifyRoutes } from './register-routes';
export { onionErrorHandler, mapErrorToResponse } from './error-handler';
export type {
  RegisterFastifyRoutesOptions,
  FastifyContextExtractor,
  ErrorResponseBody,
  ErrorItem,
  MappedErrorResponse,
} from './types';
