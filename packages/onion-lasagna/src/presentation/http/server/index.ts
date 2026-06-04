/**
 * @fileoverview Server module exports.
 *
 * This module provides server-side route registration with automatic validation.
 * It follows the BaseController pattern: requestMapper → useCase → responseMapper
 *
 * @module unified/server
 *
 * @example Simple handler (direct response)
 * ```typescript
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 *
 * const routes = serverRoutes(projectRouter)
 *   .handle('projects.get', async (req, ctx) => ({
 *     status: 200 as const,
 *     body: { id: req.pathParams.id },
 *   }))
 *   .build();
 * ```
 *
 * @example Use case pattern (requestMapper → useCase.execute() → responseMapper)
 * ```typescript
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 *
 * const routes = serverRoutes(projectRouter)
 *   .handleWithUseCase('projects.create', {
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
 *   .handleWithUseCase('projects.list', { ... })
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
