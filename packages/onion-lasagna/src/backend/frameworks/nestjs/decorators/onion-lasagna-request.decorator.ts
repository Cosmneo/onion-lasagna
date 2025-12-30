import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { HttpRequest } from '../../../core/onion-layers/presentation/interfaces/types/http/http-request';
import type { ContextualHttpRequest } from '../../../core/onion-layers/presentation/interfaces/types/http/contextual-http-request';

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

/**
 * Normalizes HTTP headers to lowercase keys with string values.
 */
function normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalized[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value.join(', ');
    } else if (value != null) {
      normalized[key.toLowerCase()] = String(value);
    }
  }
  return normalized;
}

/**
 * Parameter decorator that extracts the request from NestJS context
 * and transforms it into onion-lasagna's `HttpRequest` format.
 *
 * Optionally accepts a context extractor function to inject execution context
 * (e.g., authenticated user, request ID) into the request.
 *
 * @param contextExtractor - Optional function to extract execution context from NestJS ExecutionContext
 * @returns HttpRequest when no extractor provided, ContextualHttpRequest<TContext> when extractor provided
 *
 * @example Plain HttpRequest (no context)
 * ```typescript
 * import { Controller, Get } from '@nestjs/common';
 * import { OnionLasagnaRequest } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
 * import type { HttpRequest } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
 *
 * @Controller('users')
 * export class UsersController {
 *   @Get(':id')
 *   getUser(@OnionLasagnaRequest() request: HttpRequest) {
 *     return getUserController.execute(request);
 *   }
 * }
 * ```
 *
 * @example With context extractor
 * ```typescript
 * import { Controller, Get, UseGuards } from '@nestjs/common';
 * import { OnionLasagnaRequest, type NestContextExtractor, type ContextualHttpRequest } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
 *
 * interface AuthContext {
 *   user: { id: string; email: string };
 *   requestId: string;
 * }
 *
 * const extractAuthContext: NestContextExtractor<AuthContext> = (ctx) => {
 *   const request = ctx.switchToHttp().getRequest();
 *   return {
 *     user: request.user,        // Set by AuthGuard
 *     requestId: request.id,
 *   };
 * };
 *
 * @Controller('users')
 * export class UsersController {
 *   @UseGuards(AuthGuard)
 *   @Get(':id')
 *   getUser(@OnionLasagnaRequest(extractAuthContext) request: ContextualHttpRequest<AuthContext>) {
 *     // request.context.user is now available and type-safe
 *     return getUserController.execute(request);
 *   }
 * }
 * ```
 */
export const OnionLasagnaRequest = createParamDecorator(
  <TContext = void>(
    contextExtractor: NestContextExtractor<TContext> | undefined,
    ctx: ExecutionContext,
  ): HttpRequest | ContextualHttpRequest<TContext> => {
    const request = ctx.switchToHttp().getRequest();

    const baseRequest: HttpRequest = {
      body: request.body,
      headers: normalizeHeaders(request.headers),
      queryParams: request.query,
      pathParams: request.params,
    };

    // If contextExtractor provided, return ContextualHttpRequest
    if (contextExtractor) {
      return {
        ...baseRequest,
        context: contextExtractor(ctx),
      } as ContextualHttpRequest<TContext>;
    }

    return baseRequest;
  },
);
