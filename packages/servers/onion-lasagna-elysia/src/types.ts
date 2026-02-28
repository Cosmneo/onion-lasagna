/**
 * @fileoverview Types for the Elysia framework adapter.
 *
 * @module http/frameworks/elysia/types
 */

import type { HandlerContext } from '@cosmneo/onion-lasagna/http/server';

// Re-export shared error types
export type { ErrorItem, ErrorResponseBody, MappedErrorResponse } from '@cosmneo/onion-lasagna/http/shared';

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
   * Extracts handler context from Elysia context.
   * Use this to pass authentication info, request IDs, etc. to handlers.
   *
   * @example
   * ```typescript
   * registerElysiaRoutes(app, routes, {
   *   contextExtractor: (ctx) => ({
   *     requestId: ctx.store.requestId as string,
   *     user: ctx.store.user,
   *   }),
   * });
   * ```
   */
  readonly contextExtractor?: ElysiaContextExtractor;
}
