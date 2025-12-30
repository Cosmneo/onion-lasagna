import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  RouteHandlerMethod,
  HTTPMethods,
} from 'fastify';
import type { Controller } from '../../core/onion-layers/presentation/interfaces/types/controller.type';
import type { ContextualHttpRequest } from '../../core/onion-layers/presentation/interfaces/types/http/contextual-http-request';
import type { HttpRequest } from '../../core/onion-layers/presentation/interfaces/types/http/http-request';
import type { HttpResponse } from '../../core/onion-layers/presentation/interfaces/types/http/http-response';
import type { RouteInput } from '../../core/onion-layers/presentation/routing';

/**
 * Controller that works with HttpRequest/HttpResponse.
 */
export type HttpController = Controller<HttpRequest, HttpResponse>;

/**
 * Fastify preHandler middleware type.
 */
export type FastifyMiddleware = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void> | void;

/**
 * Converts `{param}` to Fastify's `:param` format.
 */
function toFastifyPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Extracts HttpRequest from Fastify request.
 */
function extractRequest(request: FastifyRequest): HttpRequest {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') {
      headers[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      headers[key.toLowerCase()] = value.join(', ');
    }
  }

  const queryParams: Record<string, string | string[]> = {};
  const query = request.query as Record<string, string | string[] | undefined>;
  for (const [key, value] of Object.entries(query)) {
    if (value != null) {
      queryParams[key] = value;
    }
  }

  return {
    body: request.body,
    headers,
    queryParams,
    pathParams: request.params as Record<string, string>,
  };
}

/**
 * Sends HttpResponse via Fastify reply.
 */
function sendResponse(reply: FastifyReply, response: HttpResponse): FastifyReply {
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      if (value != null) {
        reply.header(key, String(value));
      }
    }
  }

  reply.status(response.statusCode);

  if (response.body === undefined || response.body === null) {
    return reply.send();
  }

  return reply.send(response.body);
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
   * registerFastifyRoutes(app, userRoutes, {
   *   prefix: '/api/v1',
   * });
   * // Routes will be: /api/v1/users, /api/v1/users/:id, etc.
   * ```
   */
  prefix?: string;

  /**
   * Middlewares (preHandler hooks) to apply to all routes in this registration.
   * These run before the controller handler.
   *
   * @example
   * ```typescript
   * registerFastifyRoutes(app, protectedRoutes, {
   *   middlewares: [
   *     async (request, reply) => {
   *       if (!request.headers.authorization) {
   *         reply.status(401).send({ message: 'Unauthorized' });
   *       }
   *     },
   *   ],
   * });
   * ```
   */
  middlewares?: FastifyMiddleware[];
}

/**
 * Options for registering routes with execution context.
 * Requires a contextExtractor to be provided.
 *
 * @typeParam TContext - The shape of the execution context
 */
export interface RegisterContextualRoutesOptions<TContext> extends RegisterRoutesOptions {
  /**
   * Extracts execution context from the Fastify request.
   *
   * Called after preHandler hooks run, allowing access to decorated data.
   * The returned context is injected into `ContextualHttpRequest.context`.
   *
   * @param request - The Fastify request containing decorated values
   * @returns The execution context to inject into requests
   *
   * @example
   * ```typescript
   * registerFastifyRoutes(app, protectedRoutes, {
   *   middlewares: [authMiddleware],
   *   contextExtractor: (request): AuthContext => ({
   *     user: request.user,
   *     requestId: request.requestId,
   *   }),
   * });
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contextExtractor: (request: FastifyRequest<any>) => TContext;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER FASTIFY ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registers routes onto a Fastify instance (without execution context).
 *
 * Use this overload for public routes that don't require middleware-computed context.
 *
 * @param app - The Fastify instance
 * @param routes - Routes using plain HttpRequest
 * @param options - Optional configuration (prefix, middlewares)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerFastifyRoutes(
  app: FastifyInstance<any, any, any, any, any>,
  routes: RouteInputOrArray,
  options?: RegisterRoutesOptions,
): void;

/**
 * Registers routes onto a Fastify instance (with execution context).
 *
 * Use this overload for protected routes that require context from middleware
 * (e.g., authenticated user, request ID, tenant info).
 *
 * @typeParam TContext - The shape of the execution context
 * @param app - The Fastify instance
 * @param routes - Routes using ContextualHttpRequest<TContext>
 * @param options - Configuration with required contextExtractor
 *
 * @example Protected routes with auth context
 * ```typescript
 * interface AuthContext { user: User; requestId: string; }
 *
 * const protectedRoutes: ContextualRouteInput<AuthContext>[] = [...];
 *
 * registerFastifyRoutes(app, protectedRoutes, {
 *   middlewares: [authMiddleware],
 *   contextExtractor: (request): AuthContext => ({
 *     user: request.user,
 *     requestId: request.id,
 *   }),
 * });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerFastifyRoutes<TContext>(
  app: FastifyInstance<any, any, any, any, any>,
  routes: ContextualRouteInputOrArray<TContext>,
  options: RegisterContextualRoutesOptions<TContext>,
): void;

// Implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerFastifyRoutes<TContext = void>(
  app: FastifyInstance<any, any, any, any, any>,
  routes: RouteInputOrArray | ContextualRouteInputOrArray<TContext>,
  options?: RegisterRoutesOptions | RegisterContextualRoutesOptions<TContext>,
): void {
  const routeArray = Array.isArray(routes) ? routes : [routes];
  const prefix = options?.prefix ?? '';
  const middlewares = options?.middlewares ?? [];
  const contextExtractor = (options as RegisterContextualRoutesOptions<TContext>)?.contextExtractor;

  for (const { metadata, controller, requestDtoFactory } of routeArray) {
    const path = prefix + toFastifyPath(metadata.path);
    const method = metadata.method.toUpperCase() as HTTPMethods;

    const handler: RouteHandlerMethod = async (request, reply) => {
      const baseRequest = extractRequest(request);

      // Inject context if extractor is provided
      const rawRequest = contextExtractor
        ? { ...baseRequest, context: contextExtractor(request) }
        : baseRequest;

      const requestDto = requestDtoFactory(rawRequest as Parameters<typeof requestDtoFactory>[0]);
      const responseDto = await controller.execute(requestDto);
      return sendResponse(reply, responseDto.data);
    };

    app.route({
      method,
      url: path,
      preHandler: middlewares,
      handler,
    });
  }
}
