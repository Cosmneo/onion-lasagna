export {
  registerFastifyRoutes,
  type HttpController,
  type FastifyMiddleware,
  type RouteInputOrArray,
  type RegisterRoutesOptions,
} from './create-fastify-router';
export {
  mapErrorToResponse,
  type ErrorResponseBody,
  type MappedErrorResponse,
} from './map-error-to-response';
export { onionErrorHandler } from './error-handler';
