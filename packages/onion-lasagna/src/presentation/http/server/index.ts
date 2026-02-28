/**
 * @fileoverview Server module exports.
 *
 * This module provides server-side route registration with automatic validation.
 * It follows the BaseController pattern: requestMapper → useCase → responseMapper
 *
 * @module unified/server
 *
 * @example Create server routes with builder pattern
 * ```typescript
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 *
 * const routes = serverRoutes(projectRouter)
 *   .handle('projects.create', {
 *     requestMapper: (req, ctx) => ({
 *       name: req.body.name,        // Fully typed!
 *       createdBy: ctx.userId,      // Fully typed!
 *     }),
 *     useCase: createProjectUseCase,
 *     responseMapper: (output) => ({
 *       status: 201 as const,
 *       body: { projectId: output.projectId },
 *     }),
 *   })
 *   .handle('projects.list', { ... })
 *   .build();
 * ```
 */

// Builder pattern for server routes
export { serverRoutes } from './server-routes-builder';
export type {
  ServerRoutesBuilder,
  MissingHandlersError,
  BuilderHandlerConfig,
} from './server-routes-builder';

export type {
  UseCasePort,
  ValidatedRequest,
  TypedContext,
  HandlerContext,
  HandlerResponse,
  RouteHandlerConfig,
  MiddlewareFunction,
  ServerRoutesConfig,
  CreateServerRoutesOptions,
  UnifiedRouteInput,
  RawHttpRequest,
} from './types';
