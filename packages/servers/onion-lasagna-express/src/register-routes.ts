/**
 * @fileoverview Route registration for Express framework.
 *
 * Connects unified routes to an Express application.
 *
 * @module http/frameworks/express/register-routes
 */

import type { Router, Request, Response, NextFunction } from 'express';
import type {
  UnifiedRouteInput,
  RawHttpRequest,
  HandlerResponse,
} from '@cosmneo/onion-lasagna/http/server';
import type { RegisterExpressRoutesOptions } from './types';

/**
 * Supported HTTP methods in Express.
 */
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

/**
 * Converts `{param}` to Express `:param` format.
 */
function toExpressPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
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

  const query: Record<string, string | string[] | undefined> = {};
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (value != null) {
        query[key] = value as string | string[];
      }
    }
  }

  return {
    method: req.method,
    url: req.originalUrl,
    headers,
    body: req.body,
    query,
    params: req.params as Record<string, string>,
  };
}

/**
 * Sends a HandlerResponse through Express.
 */
function sendResponse(res: Response, response: HandlerResponse): void {
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      res.set(key, value);
    }
  }

  if (response.body === undefined || response.body === null) {
    res.status(response.status).end();
  } else {
    res.status(response.status).json(response.body);
  }
}

/**
 * Registers unified routes with an Express application or router.
 *
 * Each route's handler is connected to the Express routing system,
 * extracting the request, calling the handler, and sending the response.
 *
 * @remarks
 * **IMPORTANT:** You must register the `onionErrorHandler` middleware
 * AFTER calling this function to properly handle errors:
 * ```typescript
 * registerExpressRoutes(app, routes);
 * app.use(onionErrorHandler); // Must be last
 * ```
 *
 * Body parsing middleware (e.g., `express.json()`) must be registered
 * BEFORE calling this function.
 *
 * @param app - The Express application or router instance
 * @param routes - Array of unified routes from serverRoutes().build()
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { registerExpressRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna-express';
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 * import { projectHandlers } from './handlers';
 *
 * const app = express();
 * app.use(express.json());
 *
 * const routes = serverRoutes(projectRouter)
 *   .handle('...', { requestMapper, useCase, responseMapper })
 *   .build();
 * registerExpressRoutes(app, routes, { prefix: '/api/v1' });
 *
 * app.use(onionErrorHandler);
 * app.listen(3000);
 * ```
 */
export function registerExpressRoutes(
  app: Router,
  routes: readonly UnifiedRouteInput[],
  options: RegisterExpressRoutesOptions = {},
): void {
  const prefix = options.prefix ?? '';
  const contextExtractor = options.contextExtractor;

  for (const route of routes) {
    const path = prefix + toExpressPath(route.path);
    const method = route.method.toLowerCase() as HttpMethod;

    const handler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const rawRequest = extractRequest(req);
        const context = contextExtractor ? contextExtractor(req) : undefined;
        const response = await route.handler(rawRequest, context);
        sendResponse(res, response);
      } catch (error) {
        next(error);
      }
    };

    app[method](path, handler);
  }
}
