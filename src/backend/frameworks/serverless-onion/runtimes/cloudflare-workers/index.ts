// Cloudflare Workers Runtime for serverless-onion
// Only exports Cloudflare-specific implementations
// For core modules, import from '@cosmneo/onion-lasagna/backend/frameworks/serverless-onion/core'
// For routing, import from '@cosmneo/onion-lasagna/backend/core/presentation'

import { createExceptionHandler } from '../../core';
import { mapResponse } from './adapters/response';

// Cloudflare-specific adapters
export * from './adapters';

// Cloudflare-specific handler factories
export * from './handlers';

// Cloudflare-specific types
export * from './types';

// Cloudflare-specific middleware types and utilities
export * from './middleware';

/**
 * Wraps a Worker handler with centralized exception handling.
 *
 * This wrapper provides a global error boundary that:
 * - Catches all thrown exceptions (including from middlewares and controllers)
 * - Maps framework errors to appropriate HTTP status codes using `mapErrorToException`
 * - Returns structured JSON error responses
 * - Masks internal server errors to avoid leaking implementation details
 * - Logs internal server errors for debugging
 *
 * @param handler - The Worker handler to wrap
 * @returns A wrapped handler with exception handling
 *
 * @example
 * ```typescript
 * const rawHandler: WorkerHandler<Env> = async (request, env, ctx) => {
 *   // May throw errors from middlewares or controllers
 *   const result = await useCase.execute(input);
 *   return mapResponse({ statusCode: 200, body: result });
 * };
 *
 * // Wrap with exception handler
 * export default {
 *   fetch: withExceptionHandler(rawHandler),
 * };
 * ```
 */
export const withExceptionHandler = createExceptionHandler<Response>({
  mapExceptionToResponse: (exception) =>
    mapResponse({
      statusCode: exception.statusCode,
      body: exception.toResponse(),
    }),
});
