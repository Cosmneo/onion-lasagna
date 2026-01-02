/**
 * @fileoverview Server module exports.
 *
 * This module provides server-side route registration with automatic validation.
 * It follows the BaseController pattern: requestMapper → useCase → responseMapper
 *
 * @module unified/server
 *
 * @example Create server routes with builder pattern (recommended)
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
 *
 * @example Create server routes with object config (legacy)
 * ```typescript
 * import { createServerRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 *
 * const routes = createServerRoutes(projectRouter, {
 *   'projects.create': {
 *     requestMapper: (req) => ({
 *       name: req.body.name,
 *       description: req.body.description,
 *     }),
 *     useCase: createProjectUseCase,
 *     responseMapper: (out) => ({
 *       status: 201,
 *       body: { projectId: out.projectId },
 *     }),
 *   },
 * });
 * ```
 */

// Builder pattern (recommended for full type inference)
export { serverRoutes } from './server-routes-builder';
export type {
  ServerRoutesBuilder,
  MissingHandlersError,
  BuilderHandlerConfig,
} from './server-routes-builder';

// Legacy object-based config
export { createServerRoutes } from './create-server-routes';
export { defineHandler, createHandlerFactory } from './define-handler';

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
