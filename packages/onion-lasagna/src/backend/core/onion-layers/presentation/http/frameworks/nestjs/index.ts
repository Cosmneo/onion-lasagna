/**
 * @fileoverview NestJS framework adapter for onion-lasagna HTTP routes.
 *
 * NestJS works differently from other frameworks as it uses decorators
 * and the module system for routing. This adapter provides:
 *
 * - `OnionExceptionFilter` - Exception filter for error handling
 * - `OnionRequest` - Parameter decorator for request extraction
 * - `mapErrorToResponse` - Utility for custom error handling
 *
 * @module http/frameworks/nestjs
 *
 * @example Global exception filter
 * ```typescript
 * import { NestFactory } from '@nestjs/core';
 * import { OnionExceptionFilter } from '@cosmneo/onion-lasagna/http/frameworks/nestjs';
 *
 * const app = await NestFactory.create(AppModule);
 * app.useGlobalFilters(new OnionExceptionFilter());
 * ```
 *
 * @example Using OnionRequest decorator
 * ```typescript
 * import { Controller, Post, Body } from '@nestjs/common';
 * import { OnionRequest, OnionExceptionFilter } from '@cosmneo/onion-lasagna/http/frameworks/nestjs';
 * import type { RawHttpRequest } from '@cosmneo/onion-lasagna/http/server';
 *
 * @Controller('projects')
 * @UseFilters(OnionExceptionFilter)
 * export class ProjectsController {
 *   constructor(private createProjectUseCase: CreateProjectUseCase) {}
 *
 *   @Post()
 *   async createProject(@OnionRequest() request: RawHttpRequest) {
 *     const input = {
 *       name: request.body.name,
 *       description: request.body.description,
 *     };
 *     return this.createProjectUseCase.execute(input);
 *   }
 * }
 * ```
 */

export { OnionExceptionFilter } from './exception-filter';
export {
  OnionRequest,
  extractRequest,
  extractContextualRequest,
  type ContextualRawHttpRequest,
} from './request-extractor';
export { mapErrorToResponse } from './error-handler';
export type { NestContextExtractor, ErrorResponseBody, ErrorItem, MappedErrorResponse } from './types';
