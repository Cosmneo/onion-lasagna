export {
  registerFastifyRoutes,
  type HttpController,
  type FastifyMiddleware,
  type HttpRouteInput,
  type ContextualRouteInput,
  type RouteInputOrArray,
  type ContextualRouteInputOrArray,
  type RegisterRoutesOptions,
  type RegisterContextualRoutesOptions,
} from './routing';
export {
  mapErrorToResponse,
  type ErrorResponseBody,
  type MappedErrorResponse,
} from './map-error-to-response';
export { onionErrorHandler } from './error-handler';
