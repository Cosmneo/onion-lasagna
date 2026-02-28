/**
 * @fileoverview Route registration for Fastify framework.
 *
 * Connects unified routes to a Fastify application.
 *
 * @module http/frameworks/fastify/register-routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply, HTTPMethods } from 'fastify';
import type {
  UnifiedRouteInput,
  RawHttpRequest,
  HandlerResponse,
} from '@cosmneo/onion-lasagna/http/server';
import type { RegisterFastifyRoutesOptions } from './types';

/**
 * Converts `{param}` to Fastify's `:param` format.
 */
function toFastifyPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Extracts a RawHttpRequest from Fastify request/reply.
 */
function extractRequest(request: FastifyRequest): RawHttpRequest {
  // Convert headers to plain object (lowercase keys for consistency)
  // Use != null to filter both null and undefined
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    if (value != null) {
      headers[key.toLowerCase()] = value;
    }
  }

  // Extract query params (filter null/undefined values)
  const rawQuery = (request.query ?? {}) as Record<string, string | string[] | undefined>;
  const query: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(rawQuery)) {
    if (value != null) {
      query[key] = value;
    }
  }

  return {
    method: request.method,
    url: request.url,
    headers,
    body: request.body,
    query,
    params: request.params as Record<string, string>,
  };
}

/**
 * Sends a HandlerResponse through Fastify.
 */
function sendResponse(reply: FastifyReply, response: HandlerResponse): void {
  // Set response headers
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      void reply.header(key, value);
    }
  }

  // Send response
  void reply.status(response.status).send(response.body);
}

/**
 * Registers unified routes with a Fastify application.
 *
 * Each route's handler is connected to the Fastify routing system,
 * extracting the request, calling the handler, and sending the response.
 *
 * @param app - The Fastify application instance
 * @param routes - Array of unified routes from serverRoutes().build()
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import { registerFastifyRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna-fastify';
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 * import { projectHandlers } from './handlers';
 *
 * const app = Fastify();
 *
 * // Register error handler
 * app.setErrorHandler(onionErrorHandler);
 *
 * // Create unified routes using builder pattern
 * const routes = serverRoutes(projectRouter)
 *   .handle('...', { requestMapper, useCase, responseMapper })
 *   .build();
 *
 * // Register with Fastify
 * registerFastifyRoutes(app, routes, { prefix: '/api/v1' });
 *
 * await app.listen({ port: 3000 });
 * ```
 */
export function registerFastifyRoutes(
  app: FastifyInstance,
  routes: readonly UnifiedRouteInput[],
  options: RegisterFastifyRoutesOptions = {},
): void {
  const prefix = options.prefix ?? '';
  const contextExtractor = options.contextExtractor;

  for (const route of routes) {
    const path = prefix + toFastifyPath(route.path);
    const method = route.method as HTTPMethods;

    app.route({
      method,
      url: path,
      handler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
        const rawRequest = extractRequest(request);
        const context = contextExtractor ? contextExtractor(request) : undefined;
        const response = await route.handler(rawRequest, context);
        sendResponse(reply, response);
      },
    });
  }
}
