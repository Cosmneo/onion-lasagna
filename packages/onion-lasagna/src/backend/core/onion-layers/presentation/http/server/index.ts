/**
 * @fileoverview Server module exports.
 *
 * This module provides server-side route registration with automatic validation.
 * It follows the BaseController pattern: requestMapper → useCase → responseMapper
 *
 * @module unified/server
 *
 * @example Create server routes with use case
 * ```typescript
 * import { createServerRoutes } from '@cosmneo/onion-lasagna/unified/server';
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
