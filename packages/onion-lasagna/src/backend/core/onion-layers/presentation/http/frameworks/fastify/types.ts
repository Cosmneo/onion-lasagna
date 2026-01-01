/**
 * @fileoverview Types for the Fastify framework adapter.
 *
 * @module http/frameworks/fastify/types
 */

import type { FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { HandlerContext } from '../../server/types';

// Re-export shared error types
export type { ErrorItem, ErrorResponseBody, MappedErrorResponse } from '../../shared/types';

/**
 * Context extractor function for Fastify.
 * Receives the Fastify Request and returns the handler context.
 *
 * @example
 * ```typescript
 * const extractContext = (request: FastifyRequest): HandlerContext => ({
 *   requestId: request.id,
 *   user: (request as any).user,
 * });
 * ```
 */
export type FastifyContextExtractor = (request: FastifyRequest) => HandlerContext;

/**
 * Options for registering unified routes with Fastify.
 */
export interface RegisterFastifyRoutesOptions {
  /**
   * URL prefix to prepend to all routes.
   * @example '/api/v1'
   */
  readonly prefix?: string;

  /**
   * Fastify preHandler hooks to apply to all routes.
   * PreHandlers can decorate the request object which can then
   * be extracted by `contextExtractor`.
   *
   * @remarks
   * This is the Fastify-native term. For cross-framework consistency,
   * you can also use `middlewares` which is an alias for this property.
   */
  readonly preHandlers?: readonly preHandlerHookHandler[];

  /**
   * Alias for `preHandlers` for cross-framework API consistency.
   * When both are provided, they are merged (preHandlers first, then middlewares).
   *
   * @remarks
   * Use this if you prefer the same API as Hono and Elysia adapters.
   */
  readonly middlewares?: readonly preHandlerHookHandler[];

  /**
   * Extracts handler context from Fastify request.
   * Use this to pass authentication info, request IDs, etc. to handlers.
   *
   * @example
   * ```typescript
   * registerFastifyRoutes(app, routes, {
   *   preHandlers: [authPreHandler],
   *   // or use middlewares: [authPreHandler] for cross-framework consistency
   *   contextExtractor: (request) => ({
   *     requestId: request.id,
   *     user: (request as any).user,
   *   }),
   * });
   * ```
   */
  readonly contextExtractor?: FastifyContextExtractor;
}
