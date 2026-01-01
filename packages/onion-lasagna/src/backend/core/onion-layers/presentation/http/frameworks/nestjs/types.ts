/**
 * @fileoverview Types for the NestJS framework adapter.
 *
 * @module http/frameworks/nestjs/types
 */

import type { ExecutionContext } from '@nestjs/common';

// Re-export shared error types
export type { ErrorItem, ErrorResponseBody, MappedErrorResponse } from '../../shared/types';

/**
 * Context extractor function type for NestJS.
 * Receives the ExecutionContext and returns the context object.
 *
 * @typeParam TContext - The shape of the execution context
 *
 * @example
 * ```typescript
 * interface AuthContext {
 *   user: { id: string; email: string };
 *   requestId: string;
 * }
 *
 * const extractAuthContext = (ctx: ExecutionContext): AuthContext => {
 *   const request = ctx.switchToHttp().getRequest();
 *   return {
 *     user: request.user,        // Set by AuthGuard
 *     requestId: request.id,
 *   };
 * };
 * ```
 */
export type NestContextExtractor<TContext> = (ctx: ExecutionContext) => TContext;
