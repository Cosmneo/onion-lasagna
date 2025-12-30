import type { Context, Handler, Hono, MiddlewareHandler } from 'hono';
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status';
import type { Controller } from '../../core/onion-layers/presentation/interfaces/types/controller.type';
import type { ContextualHttpRequest } from '../../core/onion-layers/presentation/interfaces/types/http/contextual-http-request';
import type { HttpRequest } from '../../core/onion-layers/presentation/interfaces/types/http/http-request';
import type { HttpResponse } from '../../core/onion-layers/presentation/interfaces/types/http/http-response';
import type { RouteInput } from '../../core/onion-layers/presentation/routing';

/**
 * Supported HTTP methods in Hono.
 */
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

/**
 * Type-safe route registration function signature.
 */
type RouteRegistrar = (path: string, ...handlers: (MiddlewareHandler | Handler)[]) => Hono;

/**
 * Gets the type-safe route registrar for a given HTTP method.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRouteRegistrar(app: Hono<any, any, any>, method: string): RouteRegistrar {
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
    case 'head':
      // Hono's on() method accepts method string and path
      return ((path: string, ...handlers: (MiddlewareHandler | Handler)[]) =>
        // @ts-expect-error Hono's on() typing is complex, but runtime works
        app.on('HEAD', path, ...handlers)) as RouteRegistrar;
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
function toHonoPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
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
 * HTTP-specific route input enforcing HttpRequest as the protocol type.
 * Use this for public routes that don't require execution context.
 */
export type HttpRouteInput = RouteInput<HttpRequest>;

/**
 * Route input with execution context from middleware.
 * Use this for protected routes that require context (user, request ID, etc.).
 *
 * @typeParam TContext - The shape of the execution context
 *
 * @example
 * ```typescript
 * interface AuthContext { user: User; requestId: string; }
 * const routes: ContextualRouteInput<AuthContext>[] = [...];
 * ```
 */
export type ContextualRouteInput<TContext> = RouteInput<ContextualHttpRequest<TContext>>;

/**
 * Route input type that accepts either a single route or an array of routes.
 * Enforces HttpRequest as the protocol type for HTTP frameworks.
 */
export type RouteInputOrArray = HttpRouteInput | HttpRouteInput[];

/**
 * Contextual route input type that accepts either a single route or an array of routes.
 * Enforces ContextualHttpRequest as the protocol type.
 *
 * @typeParam TContext - The shape of the execution context
 */
export type ContextualRouteInputOrArray<TContext> =
  | ContextualRouteInput<TContext>
  | ContextualRouteInput<TContext>[];

/**
 * Base options for registering routes (without context extractor).
 */
export interface RegisterRoutesOptions {
  /**
   * Prefix to apply to all routes in this registration.
   *
   * @example
   * ```typescript
   * registerHonoRoutes(app, userRoutes, {
   *   prefix: '/api/v1',
   * });
   * // Routes will be: /api/v1/users, /api/v1/users/:id, etc.
   * ```
   */
  prefix?: string;

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
 * Options for registering routes with execution context.
 * Requires a contextExtractor to be provided.
 *
 * @typeParam TContext - The shape of the execution context
 */
export interface RegisterContextualRoutesOptions<TContext> extends RegisterRoutesOptions {
  /**
   * Extracts execution context from the Hono context.
   *
   * Called after middlewares run, allowing access to data they've set.
   * The returned context is injected into `ContextualHttpRequest.context`.
   *
   * @param c - The Hono context containing middleware-set values
   * @returns The execution context to inject into requests
   *
   * @example
   * ```typescript
   * registerHonoRoutes(app, protectedRoutes, {
   *   middlewares: [authMiddleware],
   *   contextExtractor: (c): AuthContext => ({
   *     user: c.get('user'),
   *     requestId: c.get('requestId'),
   *   }),
   * });
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contextExtractor: (c: Context<any>) => TContext;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER HONO ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registers routes onto a Hono app (without execution context).
 *
 * Use this overload for public routes that don't require middleware-computed context.
 *
 * @param app - The Hono app instance
 * @param routes - Routes using plain HttpRequest
 * @param options - Optional configuration (prefix, middlewares)
 *
 * @example Public routes
 * ```typescript
 * const publicRoutes: HttpRouteInput[] = [
 *   { metadata: { path: '/health', method: 'GET' }, controller: healthController, ... },
 *   { metadata: { path: '/login', method: 'POST' }, controller: loginController, ... },
 * ];
 *
 * registerHonoRoutes(app, publicRoutes);
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerHonoRoutes(
  app: Hono<any, any, any>,
  routes: RouteInputOrArray,
  options?: RegisterRoutesOptions,
): void;

/**
 * Registers routes onto a Hono app (with execution context).
 *
 * Use this overload for protected routes that require context from middleware
 * (e.g., authenticated user, request ID, tenant info).
 *
 * The `contextExtractor` function is called after middlewares run, extracting
 * values they've set (via `c.set()`) and injecting them into the request's `context` field.
 *
 * @typeParam TContext - The shape of the execution context
 * @param app - The Hono app instance
 * @param routes - Routes using ContextualHttpRequest<TContext>
 * @param options - Configuration with required contextExtractor
 *
 * @example Protected routes with auth context
 * ```typescript
 * interface AuthContext {
 *   user: { id: string; email: string };
 *   requestId: string;
 * }
 *
 * const authMiddleware: MiddlewareHandler = async (c, next) => {
 *   const user = await validateToken(c.req.header('authorization'));
 *   c.set('user', user);
 *   c.set('requestId', crypto.randomUUID());
 *   await next();
 * };
 *
 * const protectedRoutes: ContextualRouteInput<AuthContext>[] = [
 *   {
 *     metadata: { path: '/users', method: 'POST' },
 *     controller: createUserController,
 *     requestDtoFactory: (req) => new CreateUserRequestDto({
 *       body: req.body,
 *       createdBy: req.context.user.id, // Type-safe!
 *     }, validator),
 *   },
 * ];
 *
 * registerHonoRoutes(app, protectedRoutes, {
 *   middlewares: [authMiddleware],
 *   contextExtractor: (c): AuthContext => ({
 *     user: c.get('user'),
 *     requestId: c.get('requestId'),
 *   }),
 * });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerHonoRoutes<TContext>(
  app: Hono<any, any, any>,
  routes: ContextualRouteInputOrArray<TContext>,
  options: RegisterContextualRoutesOptions<TContext>,
): void;

// Implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerHonoRoutes<TContext = void>(
  app: Hono<any, any, any>,
  routes: RouteInputOrArray | ContextualRouteInputOrArray<TContext>,
  options?: RegisterRoutesOptions | RegisterContextualRoutesOptions<TContext>,
): void {
  const routeArray = Array.isArray(routes) ? routes : [routes];
  const prefix = options?.prefix ?? '';
  const middlewares = options?.middlewares ?? [];
  const contextExtractor = (options as RegisterContextualRoutesOptions<TContext>)?.contextExtractor;

  for (const { metadata, controller, requestDtoFactory } of routeArray) {
    const path = prefix + toHonoPath(metadata.path);
    const method = metadata.method.toLowerCase();

    const handler = async (c: Context) => {
      const baseRequest = await extractRequest(c);

      // Inject context if extractor is provided
      const rawRequest = contextExtractor
        ? { ...baseRequest, context: contextExtractor(c) }
        : baseRequest;

      const requestDto = requestDtoFactory(rawRequest as Parameters<typeof requestDtoFactory>[0]);
      const responseDto = await controller.execute(requestDto);
      return sendResponse(c, responseDto.data);
    };

    // Type-safe route registration
    const registrar = getRouteRegistrar(app, method);
    registrar(path, ...middlewares, handler);
  }
}
