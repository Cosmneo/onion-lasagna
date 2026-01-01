/**
 * @fileoverview Helper function for defining type-safe route handlers.
 *
 * This module provides a `defineHandler` function that enables TypeScript
 * to properly infer the request types from route definitions.
 *
 * @module unified/server/define-handler
 */

import type { RouterConfig, RouterDefinition, GetRoute, RouterKeys } from '../route/types';
import type { RouteHandlerConfig, ValidatedRequest, HandlerContext, HandlerResponse, UseCasePort } from './types';

/**
 * Defines a type-safe handler for a specific route.
 *
 * This helper function provides proper TypeScript inference for the
 * `requestMapper` parameter, which isn't possible with object literals alone.
 *
 * @param _router - The router definition (used only for type inference)
 * @param _key - The route key (used only for type inference)
 * @param config - The handler configuration with properly inferred types
 * @returns The same config object (identity function for types)
 *
 * @example
 * ```typescript
 * import { defineHandler } from '@cosmneo/onion-lasagna/http/server';
 * import { projectManagementRouter } from './router';
 *
 * const createHandler = defineHandler(
 *   projectManagementRouter,
 *   'projects.create',
 *   {
 *     requestMapper: (req) => ({
 *       // req.body is fully typed!
 *       name: req.body.name,
 *       description: req.body.description,
 *     }),
 *     useCase: createProjectUseCase,
 *     responseMapper: (output) => ({
 *       status: 201,
 *       body: { projectId: output.projectId },
 *     }),
 *   }
 * );
 * ```
 */
export function defineHandler<
  T extends RouterConfig,
  K extends RouterKeys<T>,
  TInput,
  TOutput,
>(
  _router: T | RouterDefinition<T>,
  _key: K,
  config: {
    readonly requestMapper: (
      req: ValidatedRequest<GetRoute<T, K>>,
      ctx: HandlerContext,
    ) => TInput;
    readonly useCase: UseCasePort<TInput, TOutput>;
    readonly responseMapper: (output: TOutput) => HandlerResponse;
  },
): RouteHandlerConfig<GetRoute<T, K>, TInput, TOutput> {
  return config as RouteHandlerConfig<GetRoute<T, K>, TInput, TOutput>;
}

/**
 * Creates a handler factory bound to a specific router.
 *
 * This is useful when defining many handlers for the same router,
 * as it reduces repetition.
 *
 * @param router - The router definition
 * @returns A factory function for creating handlers
 *
 * @example
 * ```typescript
 * import { createHandlerFactory } from '@cosmneo/onion-lasagna/http/server';
 * import { projectManagementRouter } from './router';
 *
 * const handler = createHandlerFactory(projectManagementRouter);
 *
 * const handlers = {
 *   'projects.create': handler('projects.create', {
 *     requestMapper: (req) => ({
 *       name: req.body.name,  // Fully typed!
 *     }),
 *     useCase: createProjectUseCase,
 *     responseMapper: (out) => ({ status: 201, body: { projectId: out.projectId } }),
 *   }),
 *   'projects.get': handler('projects.get', {
 *     requestMapper: (req) => ({
 *       projectId: req.pathParams.projectId,  // Fully typed!
 *     }),
 *     useCase: getProjectUseCase,
 *     responseMapper: (out) => ({ status: 200, body: out }),
 *   }),
 * };
 * ```
 */
export function createHandlerFactory<T extends RouterConfig>(
  router: T | RouterDefinition<T>,
) {
  return <K extends RouterKeys<T>, TInput, TOutput>(
    key: K,
    config: {
      readonly requestMapper: (
        req: ValidatedRequest<GetRoute<T, K>>,
        ctx: HandlerContext,
      ) => TInput;
      readonly useCase: UseCasePort<TInput, TOutput>;
      readonly responseMapper: (output: TOutput) => HandlerResponse;
    },
  ): RouteHandlerConfig<GetRoute<T, K>, TInput, TOutput> => {
    return defineHandler(router, key, config);
  };
}
