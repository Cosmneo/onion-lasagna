/**
 * @fileoverview Request extraction utilities for NestJS.
 *
 * @module http/frameworks/nestjs/request-extractor
 */

import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RawHttpRequest } from '../../server/types';
import type { NestContextExtractor } from './types';

/**
 * Request with optional context.
 */
export interface ContextualRawHttpRequest<TContext = void> extends RawHttpRequest {
  /**
   * Execution context extracted from NestJS.
   */
  readonly context: TContext;
}

/**
 * Normalizes HTTP headers to a consistent format.
 *
 * Per RFC 7230, multiple header values are joined with ", " (comma + space).
 * Filters out null/undefined values from arrays to prevent
 * converting them to "null"/"undefined" strings.
 */
function normalizeHeaders(
  headers: Record<string, unknown>,
): Record<string, string | string[] | undefined> {
  const normalized: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalized[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      // Filter out null/undefined and join per RFC 7230
      const filtered = value.filter((v): v is string | number | boolean => v != null);
      if (filtered.length > 0) {
        // Join multiple values with comma per RFC 7230 for consistency
        normalized[key.toLowerCase()] = filtered.map(String).join(', ');
      }
    } else if (value != null) {
      normalized[key.toLowerCase()] = String(value);
    }
  }
  return normalized;
}

/**
 * Extracts a RawHttpRequest from NestJS ExecutionContext.
 *
 * @param ctx - NestJS ExecutionContext
 * @returns RawHttpRequest compatible with unified route handlers
 */
export function extractRequest(ctx: ExecutionContext): RawHttpRequest {
  const request = ctx.switchToHttp().getRequest();

  return {
    method: request.method,
    url: request.url,
    headers: normalizeHeaders(request.headers),
    body: request.body,
    query: request.query,
    params: request.params,
  };
}

/**
 * Extracts a contextual RawHttpRequest from NestJS ExecutionContext.
 *
 * @param ctx - NestJS ExecutionContext
 * @param contextExtractor - Function to extract context from ExecutionContext
 * @returns ContextualRawHttpRequest with the extracted context
 */
export function extractContextualRequest<TContext>(
  ctx: ExecutionContext,
  contextExtractor: NestContextExtractor<TContext>,
): ContextualRawHttpRequest<TContext> {
  const baseRequest = extractRequest(ctx);
  return {
    ...baseRequest,
    context: contextExtractor(ctx),
  };
}

/**
 * Parameter decorator that extracts the request from NestJS context
 * and transforms it into a RawHttpRequest compatible with unified routes.
 *
 * Optionally accepts a context extractor function to inject execution context
 * (e.g., authenticated user, request ID) into the request.
 *
 * @param contextExtractor - Optional function to extract context from NestJS ExecutionContext
 * @returns RawHttpRequest when no extractor provided, ContextualRawHttpRequest when extractor provided
 *
 * @example Plain request (no context)
 * ```typescript
 * import { Controller, Get } from '@nestjs/common';
 * import { OnionRequest } from '@cosmneo/onion-lasagna/http/frameworks/nestjs';
 * import type { RawHttpRequest } from '@cosmneo/onion-lasagna/http/server';
 *
 * @Controller('users')
 * export class UsersController {
 *   @Get(':id')
 *   getUser(@OnionRequest() request: RawHttpRequest) {
 *     // request.params.id, request.query, etc.
 *   }
 * }
 * ```
 *
 * @example With context extractor
 * ```typescript
 * import { Controller, Get, UseGuards } from '@nestjs/common';
 * import { OnionRequest, type NestContextExtractor, type ContextualRawHttpRequest } from '@cosmneo/onion-lasagna/http/frameworks/nestjs';
 *
 * interface AuthContext {
 *   user: { id: string; email: string };
 *   requestId: string;
 * }
 *
 * const extractAuthContext: NestContextExtractor<AuthContext> = (ctx) => {
 *   const request = ctx.switchToHttp().getRequest();
 *   return {
 *     user: request.user,
 *     requestId: request.id,
 *   };
 * };
 *
 * @Controller('users')
 * export class UsersController {
 *   @UseGuards(AuthGuard)
 *   @Get(':id')
 *   getUser(@OnionRequest(extractAuthContext) request: ContextualRawHttpRequest<AuthContext>) {
 *     // request.context.user is available and type-safe
 *   }
 * }
 * ```
 */
export const OnionRequest = createParamDecorator(
  <TContext = void>(
    contextExtractor: NestContextExtractor<TContext> | undefined,
    ctx: ExecutionContext,
  ): RawHttpRequest | ContextualRawHttpRequest<TContext> => {
    if (contextExtractor) {
      return extractContextualRequest(ctx, contextExtractor);
    }
    return extractRequest(ctx);
  },
);
