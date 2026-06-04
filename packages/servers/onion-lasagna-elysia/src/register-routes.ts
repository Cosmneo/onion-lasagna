/**
 * @fileoverview Route registration for Elysia framework.
 *
 * Connects unified routes to an Elysia application.
 *
 * @module http/frameworks/elysia/register-routes
 */

import type { Elysia, Handler } from 'elysia';
import type {
  UnifiedRouteInput,
  RawHttpRequest,
  HandlerResponse,
} from '@cosmneo/onion-lasagna/http/server';
import type { RegisterElysiaRoutesOptions, ElysiaContext } from './types';
import { InvalidRequestError } from '@cosmneo/onion-lasagna';

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
 * Extracts a RawHttpRequest from Elysia context.
 * Uses the real request URL if available (C09-3 fix).
 */
function extractRequest(context: ElysiaContext, method: string, path: string): RawHttpRequest {
  // Convert headers to proper format (guard against null/undefined)
  const headers: Record<string, string | string[] | undefined> = {};
  if (context.headers) {
    for (const [key, value] of Object.entries(context.headers)) {
      if (value != null) {
        headers[key.toLowerCase()] = value;
      }
    }
  }

  // Convert query params (guard against null/undefined)
  const query: Record<string, string | string[] | undefined> = {};
  if (context.query) {
    for (const [key, value] of Object.entries(context.query)) {
      if (value != null) {
        query[key] = value;
      }
    }
  }

  // Use the real request URL when available; fall back to the route pattern
  const url = context.request?.url ?? path;

  return {
    method: method.toUpperCase(),
    url,
    headers,
    body: context.body,
    query,
    params: context.params ?? ({} as Record<string, string>),
  };
}

/**
 * Guards against CRLF injection in header values.
 * Returns the value with CR and LF characters stripped.
 */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, '');
}

/**
 * Creates a Response from HandlerResponse.
 * Supports multi-value headers and guards against CRLF injection.
 */
function createResponse(response: HandlerResponse): Response {
  // Build response headers, supporting multi-value (string[]) entries
  const headers = new Headers();

  // Apply handler-provided headers first (preserves Content-Type if set)
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, sanitizeHeaderValue(v));
        }
      } else {
        headers.set(key, sanitizeHeaderValue(value));
      }
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
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'text/plain');
    }
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  }

  // JSON response - only set Content-Type if not already provided
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
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
 * @param routes - Array of unified routes from serverRoutes().build()
 * @param options - Optional configuration
 *
 * @example Basic usage with error handler (required)
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { registerElysiaRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna-elysia';
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 * import { projectHandlers } from './handlers';
 *
 * // IMPORTANT: Register error handler FIRST to catch all route errors
 * const app = new Elysia()
 *   .onError(onionErrorHandler);  // Required for proper error handling
 *
 * // Create unified routes using builder pattern
 * const routes = serverRoutes(projectRouter)
 *   .handle('...', { requestMapper, useCase, responseMapper })
 *   .build();
 *
 * // Register routes with Elysia
 * registerElysiaRoutes(app, routes, { prefix: '/api/v1' });
 *
 * app.listen(3000);
 * ```
 *
 * @example With context extraction
 * ```typescript
 * const app = new Elysia()
 *   .onError(onionErrorHandler);  // Required
 *
 * registerElysiaRoutes(app, routes, {
 *   prefix: '/api/v1',
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
  const contextExtractor = options.contextExtractor;

  for (const route of routes) {
    const path = prefix + toElysiaPath(route.path);
    const method = route.method.toLowerCase() as HttpMethod;

    // Destructure context properties so Elysia's static code analysis
    // detects them and populates them (Elysia optimizes by only computing
    // properties that appear in the handler's source code).
    const handler: Handler = async ({ headers, query, body, params, store, request }) => {
      // Normalize Elysia body-parse errors (SyntaxError for malformed JSON)
      // to InvalidRequestError so they map to 400 instead of 500.
      if (body instanceof Error) {
        if (body instanceof SyntaxError) {
          throw new InvalidRequestError({
            message: 'Invalid JSON in request body',
            cause: body,
            validationErrors: [{ field: 'body', message: body.message }],
          });
        }
        throw body;
      }
      const ctx: ElysiaContext = {
        headers: headers ?? {},
        query: query ?? {},
        body,
        params: params ?? ({} as Record<string, string>),
        store: store ?? {},
        request: request as Request | undefined,
      };
      const rawRequest = extractRequest(ctx, method, path);
      const handlerContext = contextExtractor ? contextExtractor(ctx) : undefined;
      const response = await route.handler(rawRequest, handlerContext);
      return createResponse(response);
    };

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
