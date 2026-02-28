/**
 * @fileoverview NestJS adapter for onion-lasagna HTTP routes.
 *
 * Integrates onion-lasagna's unified route system into NestJS applications.
 * Useful for teams with existing NestJS codebases that want to adopt
 * onion-lasagna's type-safe route/client/schema system.
 *
 * This adapter programmatically creates NestJS controllers from unified
 * routes, letting you share route definitions, validation schemas, and
 * type-safe clients across your stack.
 *
 * @module http/frameworks/nestjs
 *
 * @example
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { OnionLasagnaModule } from '@cosmneo/onion-lasagna-nestjs';
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 *
 * const routes = serverRoutes(projectRouter)
 *   .handle('...', { requestMapper, useCase, responseMapper })
 *   .build();
 *
 * @Module({
 *   imports: [OnionLasagnaModule.register(routes, { prefix: '/api/v1' })],
 * })
 * export class AppModule {}
 * ```
 */

export { createNestController, OnionLasagnaModule } from './register-routes';
export { OnionExceptionFilter } from './exception-filter';
export { mapErrorToResponse } from './error-handler';
export type {
  NestRouteContextExtractor,
  RegisterNestRoutesOptions,
  ErrorResponseBody,
  ErrorItem,
  MappedErrorResponse,
} from './types';
