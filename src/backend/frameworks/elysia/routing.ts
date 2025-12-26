import type { Elysia, Handler } from 'elysia';
import type { Controller } from '../../core/onion-layers/presentation/interfaces/types/controller.type';
import type { HttpRequest } from '../../core/onion-layers/presentation/interfaces/types/http/http-request';
import type { HttpResponse } from '../../core/onion-layers/presentation/interfaces/types/http/http-response';
import type { RouteInput } from '../../core/onion-layers/presentation/routing';

/**
 * Supported HTTP methods in Elysia.
 */
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options';

/**
 * Controller that works with HttpRequest/HttpResponse.
 */
export type HttpController = Controller<HttpRequest, HttpResponse>;

/**
 * Elysia beforeHandle middleware type.
 * Returns undefined to continue, or a Response to short-circuit.
 */
export type ElysiaMiddleware = (context: {
  body: unknown;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  params: Record<string, string>;
}) => Response | undefined | Promise<Response | undefined>;

/**
 * Converts `{param}` to Elysia's `:param` format.
 */
function toElysiaPath(servicePath: string): string {
  return servicePath.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Extracts HttpRequest from Elysia context.
 */
function extractRequest(context: {
  body: unknown;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  params: Record<string, string>;
}): HttpRequest {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(context.headers)) {
    if (value != null) {
      headers[key.toLowerCase()] = value;
    }
  }

  const queryParams: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(context.query)) {
    if (value != null) {
      queryParams[key] = value;
    }
  }

  return {
    body: context.body,
    headers,
    queryParams,
    pathParams: context.params,
  };
}

/**
 * Creates Elysia response from HttpResponse.
 */
function createResponse(response: HttpResponse): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      if (value != null) {
        headers[key] = String(value);
      }
    }
  }

  if (response.body === undefined || response.body === null) {
    return new Response(null, {
      status: response.statusCode,
      headers,
    });
  }

  if (typeof response.body === 'string') {
    headers['Content-Type'] = 'text/plain';
    return new Response(response.body, {
      status: response.statusCode,
      headers,
    });
  }

  return new Response(JSON.stringify(response.body), {
    status: response.statusCode,
    headers,
  });
}

/**
 * Route input type that accepts either a single route or an array of routes.
 */
export type RouteInputOrArray = RouteInput<HttpController> | RouteInput<HttpController>[];

/**
 * Options for registering routes.
 */
export interface RegisterRoutesOptions {
  /**
   * Prefix to apply to all routes in this registration.
   *
   * @example
   * ```typescript
   * registerElysiaRoutes(app, userRoutes, {
   *   prefix: '/api/v1',
   * });
   * // Routes will be: /api/v1/users, /api/v1/users/:id, etc.
   * ```
   */
  prefix?: string;

  /**
   * Middlewares (beforeHandle hooks) to apply to all routes in this registration.
   * These run before the controller handler.
   *
   * @example
   * ```typescript
   * registerElysiaRoutes(app, userRoutes, {
   *   middlewares: [
   *     ({ headers }) => {
   *       if (!headers.authorization) {
   *         return new Response('Unauthorized', { status: 401 });
   *       }
   *     },
   *   ],
   * });
   * ```
   */
  middlewares?: ElysiaMiddleware[];
}

/**
 * Registers routes onto an Elysia app.
 *
 * Accepts either a single route or an array of routes. Can be called multiple
 * times to register routes from different domains/modules.
 *
 * @param app - The Elysia app instance (passed by reference)
 * @param routes - A single route or an array of routes to register
 * @param options - Optional configuration including prefix
 *
 * @example Single route
 * ```typescript
 * const app = new Elysia();
 *
 * registerElysiaRoutes(app, {
 *   metadata: { servicePath: '/health', method: 'GET' },
 *   controller: healthController,
 * });
 * ```
 *
 * @example Multiple routes
 * ```typescript
 * const app = new Elysia();
 *
 * registerElysiaRoutes(app, [
 *   { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
 *   { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: getUserController },
 *   { metadata: { servicePath: '/users/{id}', method: 'DELETE' }, controller: deleteUserController },
 * ]);
 * ```
 *
 * @example With prefix
 * ```typescript
 * registerElysiaRoutes(app, userRoutes, {
 *   prefix: '/api/v1',
 * });
 * ```
 *
 * @example With middlewares
 * ```typescript
 * registerElysiaRoutes(app, protectedRoutes, {
 *   middlewares: [
 *     ({ headers }) => {
 *       if (!headers.authorization) {
 *         return new Response('Unauthorized', { status: 401 });
 *       }
 *     },
 *   ],
 * });
 * ```
 *
 * @example Registering from multiple domains
 * ```typescript
 * const app = new Elysia();
 *
 * // Public routes
 * registerElysiaRoutes(app, publicRoutes);
 *
 * // API routes with prefix
 * registerElysiaRoutes(app, userRoutes, { prefix: '/api' });
 * registerElysiaRoutes(app, orderRoutes, { prefix: '/api' });
 *
 * export default app;
 * ```
 */
export function registerElysiaRoutes(
  app: Elysia,
  routes: RouteInputOrArray,
  options?: RegisterRoutesOptions,
): void {
  const routeArray = Array.isArray(routes) ? routes : [routes];
  const prefix = options?.prefix ?? '';
  const middlewares = options?.middlewares ?? [];

  for (const { metadata, controller } of routeArray) {
    const path = prefix + toElysiaPath(metadata.servicePath);
    const method = metadata.method.toLowerCase() as HttpMethod;

    const handler: Handler = async (context) => {
      // Run middlewares first (beforeHandle pattern)
      for (const middleware of middlewares) {
        const result = await middleware(context);
        if (result !== undefined) return result;
      }

      const request = extractRequest(context as Parameters<typeof extractRequest>[0]);
      const response = await controller.execute(request);
      return createResponse(response);
    };

    switch (method) {
      case 'get':
        app.get(path, handler);
        break;
      case 'post':
        app.post(path, handler);
        break;
      case 'put':
        app.put(path, handler);
        break;
      case 'patch':
        app.patch(path, handler);
        break;
      case 'delete':
        app.delete(path, handler);
        break;
      case 'options':
        app.options(path, handler);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }
}
