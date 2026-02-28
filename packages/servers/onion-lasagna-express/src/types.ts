/**
 * @fileoverview Types for the Express framework adapter.
 *
 * @module http/frameworks/express/types
 */

import type { Request } from 'express';
import type { HandlerContext } from '@cosmneo/onion-lasagna/http/server';

// Re-export shared error types
export type {
  ErrorItem,
  ErrorResponseBody,
  MappedErrorResponse,
} from '@cosmneo/onion-lasagna/http/shared';

/**
 * Context extractor function for Express.
 * Receives the Express Request and returns the handler context.
 *
 * @example
 * ```typescript
 * const extractContext = (req: Request): HandlerContext => ({
 *   requestId: req.headers['x-request-id'] as string,
 *   user: (req as any).user,
 * });
 * ```
 */
export type ExpressContextExtractor = (req: Request) => HandlerContext;

/**
 * Options for registering unified routes with Express.
 */
export interface RegisterExpressRoutesOptions {
  /**
   * URL prefix to prepend to all routes.
   * @example '/api/v1'
   */
  readonly prefix?: string;

  /**
   * Extracts handler context from Express request.
   * Use this to pass authentication info, request IDs, etc. to handlers.
   *
   * @example
   * ```typescript
   * registerExpressRoutes(app, routes, {
   *   contextExtractor: (req) => ({
   *     requestId: req.headers['x-request-id'] as string,
   *     user: (req as any).user,
   *   }),
   * });
   * ```
   */
  readonly contextExtractor?: ExpressContextExtractor;
}
