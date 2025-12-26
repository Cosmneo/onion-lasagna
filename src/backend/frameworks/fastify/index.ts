export {
  registerFastifyRoutes,
  type HttpController,
  type FastifyMiddleware,
  type RouteInputOrArray,
  type RegisterRoutesOptions,
} from './routing';
export {
  mapErrorToResponse,
  type ErrorResponseBody,
  type MappedErrorResponse,
} from './map-error-to-response';
export { onionErrorHandler } from './error-handler';
