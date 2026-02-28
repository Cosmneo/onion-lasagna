/**
 * @fileoverview Types for the Fastify framework adapter.
 *
 * @module http/frameworks/fastify/types
 */

import type { FastifyRequest } from 'fastify';
import type { HandlerContext } from '@cosmneo/onion-lasagna/http/server';

// Re-export shared error types
export type {
  ErrorItem,
  ErrorResponseBody,
  MappedErrorResponse,
} from '@cosmneo/onion-lasagna/http/shared';

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
   * Extracts handler context from Fastify request.
   * Use this to pass authentication info, request IDs, etc. to handlers.
   *
   * @example
   * ```typescript
   * registerFastifyRoutes(app, routes, {
   *   contextExtractor: (request) => ({
   *     requestId: request.id,
   *     user: (request as any).user,
   *   }),
   * });
   * ```
   */
  readonly contextExtractor?: FastifyContextExtractor;
}
