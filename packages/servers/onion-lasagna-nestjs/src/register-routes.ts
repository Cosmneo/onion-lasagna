/**
 * @fileoverview Route registration for NestJS framework.
 *
 * Programmatically creates NestJS controllers from unified routes,
 * integrating onion-lasagna's route system into NestJS applications.
 *
 * @module http/frameworks/nestjs/register-routes
 */

import {
  Controller,
  Module,
  UseFilters,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Options,
  Head,
  Req,
  Res,
  type DynamicModule,
  type Type,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type {
  UnifiedRouteInput,
  RawHttpRequest,
  HandlerResponse,
} from '@cosmneo/onion-lasagna/http/server';
import type { RegisterNestRoutesOptions } from './types';
import { OnionExceptionFilter } from './exception-filter';

/**
 * Converts `{param}` path format to NestJS `:param` format.
 */
function toNestPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Returns the NestJS method decorator for a given HTTP method string.
 */
function getMethodDecorator(method: string): (path?: string | string[]) => MethodDecorator {
  const map: Record<string, (path?: string | string[]) => MethodDecorator> = {
    GET: Get,
    POST: Post,
    PUT: Put,
    DELETE: Delete,
    PATCH: Patch,
    OPTIONS: Options,
    HEAD: Head,
  };

  const decorator = map[method.toUpperCase()];
  if (!decorator) {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }
  return decorator;
}

/**
 * Extracts a RawHttpRequest from an Express Request.
 */
function extractRequest(req: Request): RawHttpRequest {
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value != null) {
      headers[key.toLowerCase()] = value;
    }
  }

  return {
    method: req.method,
    url: req.url,
    headers,
    body: req.body,
    query: req.query as Record<string, string | string[] | undefined>,
    params: req.params as Record<string, string>,
  };
}

/**
 * Sends a HandlerResponse through Express.
 */
function sendResponse(res: Response, response: HandlerResponse): void {
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }
  }
  res.status(response.status);
}

/**
 * Creates a NestJS controller class dynamically from unified routes.
 *
 * Uses NestJS decorators programmatically to create a fully functional
 * controller with proper route metadata, parameter injection, and
 * exception handling.
 *
 * @param routes - Array of unified routes from serverRoutes().build()
 * @param options - Optional configuration
 * @returns A NestJS controller class ready for module registration
 *
 * @example
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { createNestController } from '@cosmneo/onion-lasagna-nestjs';
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 *
 * const routes = serverRoutes(projectRouter)
 *   .handle('...', { requestMapper, useCase, responseMapper })
 *   .build();
 * const ProjectController = createNestController(routes, { prefix: '/api/v1' });
 *
 * @Module({ controllers: [ProjectController] })
 * export class ProjectModule {}
 * ```
 */
export function createNestController(
  routes: readonly UnifiedRouteInput[],
  options: RegisterNestRoutesOptions = {},
): Type<unknown> {
  const prefix = options.prefix ?? '';
  const contextExtractor = options.contextExtractor;

  // Create controller class with index signature for dynamic method assignment
  class OnionRouteController {
    [key: string]: unknown;
  }

  // Apply @Controller(prefix)
  Controller(prefix)(OnionRouteController);

  // Apply @UseFilters(OnionExceptionFilter) at controller level
  UseFilters(OnionExceptionFilter)(OnionRouteController);

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]!;
    const path = toNestPath(route.path);
    const methodName = route.metadata?.operationId ?? `handler${i}`;

    // Define handler method on prototype
    OnionRouteController.prototype[methodName] = async function (
      req: Request,
      res: Response,
    ): Promise<unknown> {
      const rawRequest = extractRequest(req);
      const context = contextExtractor ? contextExtractor(req) : undefined;
      const response = await route.handler(rawRequest, context);
      sendResponse(res, response);
      return response.body ?? null;
    };

    // Apply HTTP method decorator (e.g., @Get(path))
    const descriptor = Object.getOwnPropertyDescriptor(OnionRouteController.prototype, methodName)!;
    getMethodDecorator(route.method)(path)(OnionRouteController.prototype, methodName, descriptor);

    // Apply @Req() at parameter index 0
    Req()(OnionRouteController.prototype, methodName, 0);

    // Apply @Res({ passthrough: true }) at parameter index 1
    Res({ passthrough: true })(OnionRouteController.prototype, methodName, 1);
  }

  return OnionRouteController;
}

/**
 * NestJS DynamicModule for registering onion-lasagna unified routes.
 *
 * Creates NestJS controllers programmatically from unified routes,
 * ensuring server implementation stays in sync with route definitions.
 *
 * @example Basic usage
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { OnionLasagnaModule } from '@cosmneo/onion-lasagna-nestjs';
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 * import { projectHandlers } from './handlers';
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
 *
 * @example With context extraction
 * ```typescript
 * @Module({
 *   imports: [
 *     OnionLasagnaModule.register(routes, {
 *       prefix: '/api/v1',
 *       contextExtractor: (req) => ({
 *         requestId: req.headers['x-request-id'] as string,
 *         user: (req as any).user,
 *       }),
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class OnionLasagnaModule {
  static register(
    routes: readonly UnifiedRouteInput[],
    options: RegisterNestRoutesOptions = {},
  ): DynamicModule {
    const controller = createNestController(routes, options);
    return {
      module: OnionLasagnaModule,
      controllers: [controller],
    };
  }
}
