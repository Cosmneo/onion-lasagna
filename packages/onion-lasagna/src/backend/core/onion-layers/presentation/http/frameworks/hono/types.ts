/**
 * @fileoverview Types for the Hono framework adapter.
 *
 * @module http/frameworks/hono/types
 */

import type { Context, MiddlewareHandler } from 'hono';
import type { HandlerContext } from '../../server/types';

// Re-export shared error types
export type { ErrorItem, ErrorResponseBody, MappedErrorResponse } from '../../shared/types';

/**
 * Context extractor function for Hono.
 * Receives the Hono Context and returns the handler context.
 *
 * @example
 * ```typescript
 * const extractContext = (c: Context): HandlerContext => ({
 *   requestId: c.get('requestId'),
 *   user: c.get('user'),
 * });
 * ```
 */
export type HonoContextExtractor = (c: Context) => HandlerContext;

/**
 * Options for registering unified routes with Hono.
 */
export interface RegisterHonoRoutesOptions {
  /**
   * URL prefix to prepend to all routes.
   * @example '/api/v1'
   */
  readonly prefix?: string;

  /**
   * Hono middleware to apply to all routes.
   * Middlewares can set values on context using `c.set()` which can then
   * be extracted by `contextExtractor`.
   */
  readonly middlewares?: readonly MiddlewareHandler[];

  /**
   * Extracts handler context from Hono context.
   * Use this to pass authentication info, request IDs, etc. to handlers.
   *
   * @example
   * ```typescript
   * registerHonoRoutes(app, routes, {
   *   middlewares: [authMiddleware],
   *   contextExtractor: (c) => ({
   *     requestId: c.get('requestId'),
   *     user: c.get('user'),
   *   }),
   * });
   * ```
   */
  readonly contextExtractor?: HonoContextExtractor;
}
