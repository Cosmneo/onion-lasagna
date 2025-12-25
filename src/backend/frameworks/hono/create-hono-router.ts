import type { Context, Handler, Hono, MiddlewareHandler } from 'hono';
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status';
import type { Controller } from '../../core/onion-layers/presentation/interfaces/types/controller.type';
import type { HttpRequest } from '../../core/onion-layers/presentation/interfaces/types/http/http-request';
import type { HttpResponse } from '../../core/onion-layers/presentation/interfaces/types/http/http-response';
import type { RouteInput } from '../../core/onion-layers/presentation/routing';

/**
 * Supported HTTP methods in Hono.
 */
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options';

/**
 * Type-safe route registration function signature.
 */
type RouteRegistrar = (path: string, ...handlers: (MiddlewareHandler | Handler)[]) => Hono;

/**
 * Gets the type-safe route registrar for a given HTTP method.
 */
function getRouteRegistrar(app: Hono, method: string): RouteRegistrar {
  const httpMethod = method as HttpMethod;
  switch (httpMethod) {
    case 'get':
      return app.get.bind(app);
    case 'post':
      return app.post.bind(app);
    case 'put':
      return app.put.bind(app);
    case 'patch':
      return app.patch.bind(app);
    case 'delete':
      return app.delete.bind(app);
    case 'options':
      return app.options.bind(app);
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}

/**
 * Controller that works with HttpRequest/HttpResponse.
 */
export type HttpController = Controller<HttpRequest, HttpResponse>;

/**
 * Hono middleware type.
 */
export type HonoMiddleware = MiddlewareHandler;

/**
 * Converts `{param}` to Hono's `:param` format.
 */
function toHonoPath(servicePath: string): string {
  return servicePath.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Extracts HttpRequest from Hono context.
 */
async function extractRequest(c: Context): Promise<HttpRequest> {
  let body: unknown;

  const method = c.req.method.toUpperCase();
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try {
      body = await c.req.json();
    } catch {
      // No JSON body
    }
  }

  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const queryParams: Record<string, string | string[]> = {};
  new URL(c.req.url).searchParams.forEach((value, key) => {
    const existing = queryParams[key];
    if (existing) {
      queryParams[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      queryParams[key] = value;
    }
  });

  return {
    body,
    headers,
    queryParams,
    pathParams: c.req.param() as Record<string, string>,
  };
}

/**
 * Sends HttpResponse via Hono context.
 */
function sendResponse(c: Context, response: HttpResponse) {
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      if (value != null) c.header(key, String(value));
    }
  }

  if (response.body === undefined || response.body === null) {
    return c.body(null, response.statusCode as StatusCode);
  }

  if (typeof response.body === 'string') {
    return c.text(response.body, response.statusCode as ContentfulStatusCode);
  }

  return c.json(response.body as object, response.statusCode as ContentfulStatusCode);
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
   * Middlewares to apply to all routes in this registration.
   * These run before the controller handler.
   *
   * @example
   * ```typescript
   * import { jwt } from 'hono/jwt';
   * import { logger } from 'hono/logger';
   *
   * registerHonoRoutes(app, userRoutes, {
   *   middlewares: [logger(), jwt({ secret: 'my-secret' })],
   * });
   * ```
   */
  middlewares?: HonoMiddleware[];
}

/**
 * Registers routes onto a Hono app.
 *
 * Accepts either a single route or an array of routes. Can be called multiple
 * times to register routes from different domains/modules.
 *
 * @param app - The Hono app instance (passed by reference)
 * @param routes - A single route or an array of routes to register
 * @param options - Optional configuration including middlewares
 *
 * @example Single route
 * ```typescript
 * const app = new Hono();
 *
 * registerHonoRoutes(app, {
 *   metadata: { servicePath: '/health', method: 'GET' },
 *   controller: healthController,
 * });
 * ```
 *
 * @example Multiple routes
 * ```typescript
 * const app = new Hono();
 *
 * registerHonoRoutes(app, [
 *   { metadata: { servicePath: '/users', method: 'POST' }, controller: createUserController },
 *   { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: getUserController },
 *   { metadata: { servicePath: '/users/{id}', method: 'DELETE' }, controller: deleteUserController },
 * ]);
 * ```
 *
 * @example With middlewares
 * ```typescript
 * import { jwt } from 'hono/jwt';
 *
 * registerHonoRoutes(app, protectedRoutes, {
 *   middlewares: [jwt({ secret: 'my-secret' })],
 * });
 * ```
 *
 * @example Registering from multiple domains
 * ```typescript
 * const app = new Hono();
 *
 * // Public routes - no auth
 * registerHonoRoutes(app, publicRoutes);
 *
 * // Protected routes - with auth middleware
 * registerHonoRoutes(app, userRoutes, { middlewares: [authMiddleware] });
 * registerHonoRoutes(app, orderRoutes, { middlewares: [authMiddleware] });
 *
 * export default app;
 * ```
 */
export function registerHonoRoutes(
  app: Hono,
  routes: RouteInputOrArray,
  options?: RegisterRoutesOptions,
): void {
  const routeArray = Array.isArray(routes) ? routes : [routes];
  const middlewares = options?.middlewares ?? [];

  for (const { metadata, controller } of routeArray) {
    const path = toHonoPath(metadata.servicePath);
    const method = metadata.method.toLowerCase();

    const handler = async (c: Context) => {
      const request = await extractRequest(c);
      const response = await controller.execute(request);
      return sendResponse(c, response);
    };

    // Type-safe route registration
    const registrar = getRouteRegistrar(app, method);
    registrar(path, ...middlewares, handler);
  }
}
