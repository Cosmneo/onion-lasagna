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
 * Structural interface for Hono app compatibility.
 *
 * This interface enables type-safe usage of Hono across package boundaries
 * without requiring the exact same Hono class instance. TypeScript treats
 * classes with private members nominally, which causes issues when different
 * packages have their own Hono installation.
 *
 * By using this structural interface, we allow any object that implements
 * the `on` method (which is what we use for route registration) to be accepted.
 */
export interface HonoLike {
  /**
   * Register a route handler for a specific HTTP method and path.
   */
  on: (
    method: string | string[],
    path: string | string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...handlers: any[]
  ) => unknown;
}

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
