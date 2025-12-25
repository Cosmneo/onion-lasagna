import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Response } from 'express';

/**
 * Interface matching onion-lasagna's HttpResponse type.
 */
interface HttpResponseLike {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string | number | boolean | undefined>;
}

/**
 * Type guard to check if a value is an HttpResponse-like object.
 */
function isHttpResponse(value: unknown): value is HttpResponseLike {
  if (!value || typeof value !== 'object') return false;
  const obj = value as HttpResponseLike;
  return typeof obj.statusCode === 'number' && 'body' in obj;
}

/**
 * NestJS interceptor that transforms onion-lasagna `HttpResponse` objects
 * into proper NestJS responses.
 *
 * When a controller returns an `HttpResponse` object (with `statusCode`, `body`, and optional `headers`),
 * this interceptor:
 * 1. Sets the HTTP status code from `response.statusCode`
 * 2. Sets any custom headers from `response.headers`
 * 3. Returns only `response.body` to NestJS for serialization
 *
 * If the response is not an `HttpResponse` object, it passes through unchanged.
 *
 * @example
 * ```typescript
 * import { Controller, Get, UseInterceptors, UseFilters } from '@nestjs/common';
 * import { OnionRequest, OnionExceptionFilter, OnionResponseInterceptor } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
 * import type { HttpRequest } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
 *
 * @Controller('users')
 * @UseFilters(OnionExceptionFilter)
 * @UseInterceptors(OnionResponseInterceptor)
 * export class UsersController {
 *   @Get(':id')
 *   getUser(@OnionRequest() request: HttpRequest) {
 *     return getUserController.execute(request);
 *   }
 * }
 * ```
 *
 * @example Global registration in main.ts
 * ```typescript
 * import { NestFactory } from '@nestjs/core';
 * import { OnionExceptionFilter, OnionResponseInterceptor } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
 *
 * const app = await NestFactory.create(AppModule);
 * app.useGlobalFilters(new OnionExceptionFilter());
 * app.useGlobalInterceptors(new OnionResponseInterceptor());
 * await app.listen(3000);
 * ```
 */
@Injectable()
export class OnionResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        // If not an HttpResponse, pass through unchanged
        if (!isHttpResponse(data)) {
          return data;
        }

        const res = context.switchToHttp().getResponse<Response>();

        // Set status code
        res.status(data.statusCode);

        // Set custom headers
        if (data.headers) {
          for (const [key, value] of Object.entries(data.headers)) {
            if (value != null) {
              res.setHeader(key, String(value));
            }
          }
        }

        // Return only the body for NestJS serialization
        return data.body;
      }),
    );
  }
}
