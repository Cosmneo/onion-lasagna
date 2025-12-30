import type { Elysia, Handler } from 'elysia';
import type { BaseDto } from '../../core/global/classes/base-dto.class';
import type { Controller } from '../../core/onion-layers/presentation/interfaces/types/controller.type';
import type { ContextualHttpRequest } from '../../core/onion-layers/presentation/interfaces/types/http/contextual-http-request';
import type { HttpRequest } from '../../core/onion-layers/presentation/interfaces/types/http/http-request';
import type { HttpResponse } from '../../core/onion-layers/presentation/interfaces/types/http/http-response';
import type { RouteInput } from '../../core/onion-layers/presentation/routing';

/**
 * Supported HTTP methods in Elysia.
 */
type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

/**
 * Controller that works with a validated request DTO and returns HttpResponse.
 */
export type HttpController<TRequestDto extends BaseDto<unknown> = BaseDto<unknown>> = Controller<
  TRequestDto,
  HttpResponse
>;

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
function toElysiaPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
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
 * Elysia context type for context extraction.
 */
export interface ElysiaContext {
  body: unknown;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  params: Record<string, string>;
  store: Record<string, unknown>;
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
 * Options for registering routes with execution context.
 * Requires a contextExtractor to be provided.
 *
 * @typeParam TContext - The shape of the execution context
 */
export interface RegisterContextualRoutesOptions<TContext> extends RegisterRoutesOptions {
  /**
   * Extracts execution context from the Elysia context.
   *
   * Called after middlewares run, allowing access to data they've set.
   * The returned context is injected into `ContextualHttpRequest.context`.
   *
   * @param ctx - The Elysia context containing store and request data
   * @returns The execution context to inject into requests
   *
   * @example
   * ```typescript
   * registerElysiaRoutes(app, protectedRoutes, {
   *   middlewares: [authMiddleware],
   *   contextExtractor: (ctx): AuthContext => ({
   *     user: ctx.store.user as User,
   *     requestId: ctx.store.requestId as string,
   *   }),
   * });
   * ```
   */
  contextExtractor: (ctx: ElysiaContext) => TContext;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER ELYSIA ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registers routes onto an Elysia app (without execution context).
 *
 * Use this overload for public routes that don't require middleware-computed context.
 *
 * @param app - The Elysia app instance
 * @param routes - Routes using plain HttpRequest
 * @param options - Optional configuration (prefix, middlewares)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerElysiaRoutes(
  app: Elysia<any, any, any, any, any, any, any>,
  routes: RouteInputOrArray,
  options?: RegisterRoutesOptions,
): void;

/**
 * Registers routes onto an Elysia app (with execution context).
 *
 * Use this overload for protected routes that require context from middleware
 * (e.g., authenticated user, request ID, tenant info).
 *
 * @typeParam TContext - The shape of the execution context
 * @param app - The Elysia app instance
 * @param routes - Routes using ContextualHttpRequest<TContext>
 * @param options - Configuration with required contextExtractor
 *
 * @example Protected routes with auth context
 * ```typescript
 * interface AuthContext { user: User; requestId: string; }
 *
 * const protectedRoutes: ContextualRouteInput<AuthContext>[] = [...];
 *
 * registerElysiaRoutes(app, protectedRoutes, {
 *   middlewares: [authMiddleware],
 *   contextExtractor: (ctx): AuthContext => ({
 *     user: ctx.store.user as User,
 *     requestId: ctx.store.requestId as string,
 *   }),
 * });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerElysiaRoutes<TContext>(
  app: Elysia<any, any, any, any, any, any, any>,
  routes: ContextualRouteInputOrArray<TContext>,
  options: RegisterContextualRoutesOptions<TContext>,
): void;

// Implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerElysiaRoutes<TContext = void>(
  app: Elysia<any, any, any, any, any, any, any>,
  routes: RouteInputOrArray | ContextualRouteInputOrArray<TContext>,
  options?: RegisterRoutesOptions | RegisterContextualRoutesOptions<TContext>,
): void {
  const routeArray = Array.isArray(routes) ? routes : [routes];
  const prefix = options?.prefix ?? '';
  const middlewares = options?.middlewares ?? [];
  const contextExtractor = (options as RegisterContextualRoutesOptions<TContext>)?.contextExtractor;

  for (const { metadata, controller, requestDtoFactory } of routeArray) {
    const path = prefix + toElysiaPath(metadata.path);
    const method = metadata.method.toLowerCase() as HttpMethod;

    const handler: Handler = async (context) => {
      // Run middlewares first (beforeHandle pattern)
      for (const middleware of middlewares) {
        const result = await middleware(context);
        if (result !== undefined) return result;
      }

      const baseRequest = extractRequest(context as Parameters<typeof extractRequest>[0]);

      // Inject context if extractor is provided
      const rawRequest = contextExtractor
        ? { ...baseRequest, context: contextExtractor(context as ElysiaContext) }
        : baseRequest;

      const requestDto = requestDtoFactory(rawRequest as Parameters<typeof requestDtoFactory>[0]);
      const responseDto = await controller.execute(requestDto);
      return createResponse(responseDto.data);
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
