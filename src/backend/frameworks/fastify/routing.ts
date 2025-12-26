import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  RouteHandlerMethod,
  HTTPMethods,
} from 'fastify';
import type { Controller } from '../../core/onion-layers/presentation/interfaces/types/controller.type';
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
 * Route input type that accepts either a single route or an array of routes.
 */
export type RouteInputOrArray = RouteInput | RouteInput[];

/**
 * Options for registering routes.
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
 * Registers routes onto a Fastify instance.
 *
 * Accepts either a single route or an array of routes. Can be called multiple
 * times to register routes from different domains/modules.
 *
 * @param app - The Fastify instance (passed by reference)
 * @param routes - A single route or an array of routes to register
 * @param options - Optional configuration including prefix
 *
 * @example Single route
 * ```typescript
 * const app = Fastify();
 *
 * registerFastifyRoutes(app, {
 *   metadata: { path: '/health', method: 'GET' },
 *   controller: healthController,
 * });
 * ```
 *
 * @example Multiple routes
 * ```typescript
 * const app = Fastify();
 *
 * registerFastifyRoutes(app, [
 *   { metadata: { path: '/users', method: 'POST' }, controller: createUserController },
 *   { metadata: { path: '/users/{id}', method: 'GET' }, controller: getUserController },
 *   { metadata: { path: '/users/{id}', method: 'DELETE' }, controller: deleteUserController },
 * ]);
 * ```
 *
 * @example With prefix
 * ```typescript
 * registerFastifyRoutes(app, userRoutes, {
 *   prefix: '/api/v1',
 * });
 * ```
 *
 * @example With middlewares
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
 *
 * @example Registering from multiple domains
 * ```typescript
 * const app = Fastify();
 *
 * // Public routes
 * registerFastifyRoutes(app, publicRoutes);
 *
 * // API routes with prefix
 * registerFastifyRoutes(app, userRoutes, { prefix: '/api' });
 * registerFastifyRoutes(app, orderRoutes, { prefix: '/api' });
 *
 * await app.listen({ port: 3000 });
 * ```
 */
export function registerFastifyRoutes(
  app: FastifyInstance,
  routes: RouteInputOrArray,
  options?: RegisterRoutesOptions,
): void {
  const routeArray = Array.isArray(routes) ? routes : [routes];
  const prefix = options?.prefix ?? '';
  const middlewares = options?.middlewares ?? [];

  for (const { metadata, controller, requestDtoFactory } of routeArray) {
    const path = prefix + toFastifyPath(metadata.path);
    const method = metadata.method.toUpperCase() as HTTPMethods;

    const handler: RouteHandlerMethod = async (request, reply) => {
      const rawRequest = extractRequest(request);
      const requestDto = requestDtoFactory(rawRequest);
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
