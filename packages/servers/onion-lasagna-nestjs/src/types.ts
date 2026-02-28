/**
 * @fileoverview Types for the NestJS framework adapter.
 *
 * @module http/frameworks/nestjs/types
 */

import type { Request } from 'express';
import type { HandlerContext } from '@cosmneo/onion-lasagna/http/server';

// Re-export shared error types
export type { ErrorItem, ErrorResponseBody, MappedErrorResponse } from '@cosmneo/onion-lasagna/http/shared';

/**
 * Context extractor for programmatic route registration.
 * Receives the Express Request and returns the handler context.
 *
 * @example
 * ```typescript
 * const extractContext: NestRouteContextExtractor = (req) => ({
 *   requestId: req.headers['x-request-id'] as string,
 *   user: (req as any).user,
 * });
 * ```
 */
export type NestRouteContextExtractor = (request: Request) => HandlerContext;

/**
 * Options for registering unified routes with NestJS.
 */
export interface RegisterNestRoutesOptions {
  /**
   * URL prefix to prepend to all routes (becomes the controller base path).
   * @example '/api/v1'
   */
  readonly prefix?: string;

  /**
   * Extracts handler context from Express request.
   * Use this to pass authentication info, request IDs, etc. to handlers.
   *
   * @example
   * ```typescript
   * OnionLasagnaModule.register(routes, {
   *   prefix: '/api/v1',
   *   contextExtractor: (req) => ({
   *     requestId: req.headers['x-request-id'] as string,
   *     user: (req as any).user,
   *   }),
   * });
   * ```
   */
  readonly contextExtractor?: NestRouteContextExtractor;
}
