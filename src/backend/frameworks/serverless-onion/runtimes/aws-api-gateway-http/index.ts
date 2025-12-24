// AWS API Gateway HTTP v2 Runtime for serverless-onion
// Re-exports core modules plus AWS-specific implementations

// Routing (from core presentation layer)
export {
  createRoutePattern,
  createRoutingMap,
  createRouteMatchResolver,
  createRouteResolver,
  createRoutes,
  extractPathParams,
  type ExecutableController,
  type ResolvedRoute,
  type RouteDefinition,
  type RouteInput,
  type RouteMetadata,
} from '../../../../core/bounded-context/presentation/routing';

// Core serverless-onion modules
export {
  // Exceptions
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
  // Types
  type ErrorItem,
  type HttpExceptionResponse,
  // Mappers
  mapErrorToException,
  // Wrappers
  createExceptionHandler,
  // Constants
  BASE_HEADERS,
  // Middleware
  runMiddlewareChain,
} from '../../core';

// AWS-specific middleware (typed for APIGatewayProxyEventV2)
export {
  // Types
  type Middleware,
  type MiddlewareOutput,
  type MiddlewareInput,
  type AccumulatedContext,
  type EmptyMiddlewareChain,
  type NonEmptyMiddlewareChain,
  // Factory
  defineMiddleware,
} from './middleware';

// AWS-specific adapters
export * from './adapters';

// AWS-specific features
export * from './features';

// AWS-specific handler factories
export * from './handlers';

// AWS-specific types
export * from './types';

// AWS-specific wrappers
export * from './wrappers';
