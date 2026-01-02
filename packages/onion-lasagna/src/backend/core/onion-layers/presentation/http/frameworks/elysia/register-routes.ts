/**
 * @fileoverview Route registration for Elysia framework.
 *
 * Connects unified routes to an Elysia application.
 *
 * @module http/frameworks/elysia/register-routes
 */

import type { Elysia, Handler } from 'elysia';
import type { UnifiedRouteInput, RawHttpRequest, HandlerResponse } from '../../server/types';
import type { RegisterElysiaRoutesOptions, ElysiaMiddleware, ElysiaContext } from './types';

/**
 * Supported HTTP methods in Elysia.
 */
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

/**
 * Converts `{param}` to Elysia's `:param` format.
 */
function toElysiaPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Composes multiple middlewares into a single function.
 *
 * Each middleware can short-circuit by returning a Response.
 * If all middlewares pass (return undefined), the final handler is called.
 *
 * @param middlewares - Array of middleware functions
 * @param finalHandler - The handler to call if all middlewares pass
 * @returns A composed handler function
 */
function composeMiddleware(
  middlewares: readonly ElysiaMiddleware[],
  finalHandler: (ctx: ElysiaContext) => Promise<Response>,
): (ctx: ElysiaContext) => Promise<Response> {
  if (middlewares.length === 0) {
    return finalHandler;
  }

  return async (ctx: ElysiaContext): Promise<Response> => {
    for (const middleware of middlewares) {
      const result = await middleware(ctx);
      if (result !== undefined) {
        return result;
      }
    }
    return finalHandler(ctx);
  };
}

/**
 * Extracts a RawHttpRequest from Elysia context.
 */
function extractRequest(context: ElysiaContext, method: string, path: string): RawHttpRequest {
  // Convert headers to proper format
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(context.headers)) {
    if (value != null) {
      headers[key.toLowerCase()] = value;
    }
  }

  // Convert query params
  const query: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(context.query)) {
    if (value != null) {
      query[key] = value;
    }
  }

  return {
    method: method.toUpperCase(),
    url: path,
    headers,
    body: context.body,
    query,
    params: context.params,
  };
}

/**
 * Creates a Response from HandlerResponse.
 */
function createResponse(response: HandlerResponse): Response {
  // Start with empty headers, will set defaults if not provided by handler
  const headers: Record<string, string> = {};

  // Apply handler-provided headers first (preserves Content-Type if set)
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      headers[key] = value;
    }
  }

  if (response.body === undefined || response.body === null) {
    return new Response(null, {
      status: response.status,
      headers,
    });
  }

  if (typeof response.body === 'string') {
    // Only default to text/plain if Content-Type wasn't already set
    // This allows handlers to return XML, CSV, HTML, etc.
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'text/plain';
    }
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  }

  // JSON response - only set Content-Type if not already provided
  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return new Response(JSON.stringify(response.body), {
    status: response.status,
    headers,
  });
}

/**
 * Registers unified routes with an Elysia application.
 *
 * Each route's handler is connected to the Elysia routing system,
 * extracting the request, calling the handler, and sending the response.
 *
 * @remarks
 * **IMPORTANT:** You must register the `onionErrorHandler` with your Elysia app
 * using `.onError()` to properly handle and map errors to HTTP responses.
 * Without this, errors from your handlers will not be properly formatted.
 *
 * @param app - The Elysia application instance
 * @param routes - Array of unified routes from createServerRoutes
 * @param options - Optional configuration
 *
 * @example Basic usage with error handler (required)
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { registerElysiaRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/elysia';
 * import { createServerRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 * import { projectHandlers } from './handlers';
 *
 * // IMPORTANT: Register error handler FIRST to catch all route errors
 * const app = new Elysia()
 *   .onError(onionErrorHandler);  // Required for proper error handling
 *
 * // Create unified routes
 * const routes = createServerRoutes(projectRouter, projectHandlers);
 *
 * // Register routes with Elysia
 * registerElysiaRoutes(app, routes, { prefix: '/api/v1' });
 *
 * app.listen(3000);
 * ```
 *
 * @example With middlewares and context extraction
 * ```typescript
 * const app = new Elysia()
 *   .onError(onionErrorHandler);  // Required
 *
 * registerElysiaRoutes(app, routes, {
 *   prefix: '/api/v1',
 *   middlewares: [authMiddleware],
 *   contextExtractor: (ctx) => ({
 *     user: ctx.store.user,
 *     requestId: ctx.store.requestId,
 *   }),
 * });
 * ```
 */
export function registerElysiaRoutes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Elysia<any, any, any, any, any, any, any>,
  routes: readonly UnifiedRouteInput[],
  options: RegisterElysiaRoutesOptions = {},
): void {
  const prefix = options.prefix ?? '';
  const middlewares = options.middlewares ?? [];
  const contextExtractor = options.contextExtractor;

  for (const route of routes) {
    const path = prefix + toElysiaPath(route.path);
    const method = route.method.toLowerCase() as HttpMethod;

    // Create the core handler that processes the request
    const coreHandler = async (ctx: ElysiaContext): Promise<Response> => {
      const rawRequest = extractRequest(ctx, method, path);
      const handlerContext = contextExtractor ? contextExtractor(ctx) : undefined;
      const response = await route.handler(rawRequest, handlerContext);
      return createResponse(response);
    };

    // Compose middlewares with the core handler
    const composedHandler = composeMiddleware(middlewares, coreHandler);

    const handler: Handler = (context) => composedHandler(context as ElysiaContext);

    // Cast to base Elysia type to avoid generic handler type issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elysiaApp = app as Elysia<any>;

    switch (method) {
      case 'get':
        elysiaApp.get(path, handler);
        break;
      case 'post':
        elysiaApp.post(path, handler);
        break;
      case 'put':
        elysiaApp.put(path, handler);
        break;
      case 'patch':
        elysiaApp.patch(path, handler);
        break;
      case 'delete':
        elysiaApp.delete(path, handler);
        break;
      case 'options':
        elysiaApp.options(path, handler);
        break;
      case 'head':
        elysiaApp.head(path, handler);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }
}
