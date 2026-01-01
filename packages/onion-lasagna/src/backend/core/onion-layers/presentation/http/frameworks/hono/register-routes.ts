/**
 * @fileoverview Route registration for Hono framework.
 *
 * Connects unified routes to a Hono application.
 *
 * @module http/frameworks/hono/register-routes
 */

import type { Hono, Context } from 'hono';
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status';
import type { UnifiedRouteInput, RawHttpRequest, HandlerResponse } from '../../server/types';
import type { RegisterHonoRoutesOptions } from './types';
import { InvalidRequestError } from '../../../exceptions/invalid-request.error';

/**
 * Extracts a RawHttpRequest from a Hono context.
 */
async function extractRequest(c: Context): Promise<RawHttpRequest> {
  // Extract headers as a plain object (lowercase keys for consistency)
  // Use != null to filter both null and undefined
  const headers: Record<string, string | string[] | undefined> = {};
  c.req.raw.headers.forEach((value, key) => {
    if (value != null) {
      headers[key.toLowerCase()] = value;
    }
  });

  // Extract query params (use != null to filter both null and undefined)
  const url = new URL(c.req.url);
  const query: Record<string, string | string[] | undefined> = {};
  url.searchParams.forEach((value, key) => {
    if (value == null) return;
    const existing = query[key];
    if (existing == null) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  });

  // Parse body for methods that support it
  let body: unknown;
  const method = c.req.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const contentType = c.req.header('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        body = await c.req.json();
      } catch (error) {
        throw new InvalidRequestError({
          message: 'Invalid JSON in request body',
          cause: error,
          validationErrors: [
            {
              field: 'body',
              message: error instanceof Error ? error.message : 'Malformed JSON',
            },
          ],
        });
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        body = await c.req.parseBody();
      } catch (error) {
        throw new InvalidRequestError({
          message: 'Invalid form data in request body',
          cause: error,
          validationErrors: [
            {
              field: 'body',
              message: error instanceof Error ? error.message : 'Malformed form data',
            },
          ],
        });
      }
    } else if (contentType.includes('multipart/form-data')) {
      try {
        body = await c.req.parseBody();
      } catch (error) {
        throw new InvalidRequestError({
          message: 'Invalid multipart form data in request body',
          cause: error,
          validationErrors: [
            {
              field: 'body',
              message: error instanceof Error ? error.message : 'Malformed multipart data',
            },
          ],
        });
      }
    }
  }

  return {
    method: c.req.method,
    url: c.req.url,
    headers,
    body,
    query,
    params: c.req.param() as Record<string, string>,
  };
}

/**
 * Sends a HandlerResponse through Hono.
 */
function sendResponse(c: Context, response: HandlerResponse): Response {
  // Set response headers
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      c.header(key, value);
    }
  }

  // Return response with proper type assertions for Hono
  if (response.body === undefined || response.body === null) {
    return c.body(null, response.status as StatusCode);
  }

  return c.json(response.body as object, response.status as ContentfulStatusCode);
}

/**
 * Registers unified routes with a Hono application.
 *
 * Each route's handler is connected to the Hono routing system,
 * extracting the request, calling the handler, and sending the response.
 *
 * @param app - The Hono application instance
 * @param routes - Array of unified routes from createServerRoutes
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { registerHonoRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/hono';
 * import { createServerRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 * import { projectHandlers } from './handlers';
 *
 * const app = new Hono();
 *
 * // Register error handler
 * app.onError(onionErrorHandler);
 *
 * // Create unified routes
 * const routes = createServerRoutes(projectRouter, projectHandlers);
 *
 * // Register with Hono
 * registerHonoRoutes(app, routes, { prefix: '/api/v1' });
 *
 * export default app;
 * ```
 */
export function registerHonoRoutes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: Hono<any, any, any>,
  routes: readonly UnifiedRouteInput[],
  options: RegisterHonoRoutesOptions = {},
): void {
  const prefix = options.prefix ?? '';
  const middlewares = options.middlewares ?? [];
  const contextExtractor = options.contextExtractor;

  for (const route of routes) {
    const path = prefix + route.path;
    const method = route.method.toLowerCase();

    const handler = async (c: Context): Promise<Response> => {
      const rawRequest = await extractRequest(c);
      const context = contextExtractor ? contextExtractor(c) : undefined;
      const response = await route.handler(rawRequest, context);
      return sendResponse(c, response);
    };

    // Use app.on() for flexible method routing with middlewares
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const honoApp = app as any;

    if (middlewares.length > 0) {
      honoApp.on(method, path, ...middlewares, handler);
    } else {
      honoApp.on(method, path, handler);
    }
  }
}
