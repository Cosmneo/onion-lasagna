import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { HttpRequest } from '../../../core/onion-layers/presentation/interfaces/types/http/http-request';

/**
 * Normalizes HTTP headers to lowercase keys with string values.
 */
function normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = String(value);
  }
  return normalized;
}

/**
 * Parameter decorator that extracts the request from NestJS context
 * and transforms it into onion-lasagna's `HttpRequest` format.
 *
 * @example
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
 */
export const OnionLasagnaRequest = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): HttpRequest => {
    const request = ctx.switchToHttp().getRequest();

    return {
      body: request.body,
      headers: normalizeHeaders(request.headers),
      queryParams: request.query,
      pathParams: request.params,
    };
  },
);
