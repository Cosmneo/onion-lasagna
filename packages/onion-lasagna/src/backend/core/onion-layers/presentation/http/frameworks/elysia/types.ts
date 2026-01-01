/**
 * @fileoverview Types for the Elysia framework adapter.
 *
 * @module http/frameworks/elysia/types
 */

import type { HandlerContext } from '../../server/types';

// Re-export shared error types
export type { ErrorItem, ErrorResponseBody, MappedErrorResponse } from '../../shared/types';

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
 * Elysia beforeHandle middleware type.
 * Returns undefined to continue, or a Response to short-circuit.
 */
export type ElysiaMiddleware = (
  context: ElysiaContext,
) => Response | undefined | Promise<Response | undefined>;

/**
 * Context extractor function for Elysia.
 * Receives the Elysia context and returns the handler context.
 *
 * @example
 * ```typescript
 * const extractContext = (ctx: ElysiaContext): HandlerContext => ({
 *   requestId: ctx.store.requestId as string,
 *   user: ctx.store.user,
 * });
 * ```
 */
export type ElysiaContextExtractor = (ctx: ElysiaContext) => HandlerContext;

/**
 * Options for registering unified routes with Elysia.
 */
export interface RegisterElysiaRoutesOptions {
  /**
   * URL prefix to prepend to all routes.
   * @example '/api/v1'
   */
  readonly prefix?: string;

  /**
   * Elysia middlewares (beforeHandle hooks) to apply to all routes.
   * Middlewares can set values on `ctx.store` which can then
   * be extracted by `contextExtractor`.
   */
  readonly middlewares?: readonly ElysiaMiddleware[];

  /**
   * Extracts handler context from Elysia context.
   * Use this to pass authentication info, request IDs, etc. to handlers.
   *
   * @example
   * ```typescript
   * registerElysiaRoutes(app, routes, {
   *   middlewares: [authMiddleware],
   *   contextExtractor: (ctx) => ({
   *     requestId: ctx.store.requestId as string,
   *     user: ctx.store.user,
   *   }),
   * });
   * ```
   */
  readonly contextExtractor?: ElysiaContextExtractor;
}
