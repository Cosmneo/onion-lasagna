/**
 * @fileoverview NestJS exception filter for onion-lasagna errors.
 *
 * @module http/frameworks/nestjs/exception-filter
 */

import { Catch, type ExceptionFilter, type ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';
import { mapErrorToResponse } from './error-handler';
import { InvalidRequestError } from '@cosmneo/onion-lasagna';

/**
 * NestJS exception filter that maps onion-lasagna errors to HTTP responses.
 *
 * Mapping strategy:
 * - `ObjectValidationError` → 400 Bad Request (with field errors)
 * - `InvalidRequestError` → 400 Bad Request (with field errors)
 * - `UseCaseError` → 400 Bad Request
 * - `AccessDeniedError` → 403 Forbidden
 * - `NotFoundError` → 404 Not Found
 * - `ConflictError` → 409 Conflict
 * - `UnprocessableError` → 422 Unprocessable Entity
 * - `DomainError` → 500 Internal Server Error (masked)
 * - `InfraError` → 500 Internal Server Error (masked)
 * - `ControllerError` → 500 Internal Server Error (masked)
 * - Unknown → 500 Internal Server Error (masked)
 *
 * **Security Note:** Domain and infrastructure errors are masked to avoid
 * leaking internal implementation details.
 *
 * @example Controller-level registration
 * ```typescript
 * import { Controller, UseFilters } from '@nestjs/common';
 * import { OnionExceptionFilter } from '@cosmneo/onion-lasagna-nestjs';
 *
 * @Controller('users')
 * @UseFilters(OnionExceptionFilter)
 * export class UsersController {
 *   // ...
 * }
 * ```
 *
 * @example Global registration in main.ts
 * ```typescript
 * import { NestFactory } from '@nestjs/core';
 * import { OnionExceptionFilter } from '@cosmneo/onion-lasagna-nestjs';
 *
 * const app = await NestFactory.create(AppModule);
 * app.useGlobalFilters(new OnionExceptionFilter());
 * ```
 */
/**
 * Normalizes a body-parser SyntaxError (NestJS / Express platform) into an
 * `InvalidRequestError` so it maps to 400 instead of 500.
 */
function normalizeBodyParseError(exception: unknown): unknown {
  if (exception instanceof SyntaxError) {
    // body-parser decorates SyntaxError with `body` and `status` (400)
    const errObj = exception as unknown as Record<string, unknown>;
    if ('body' in errObj && 'status' in errObj && errObj['status'] === 400) {
      return new InvalidRequestError({
        message: 'Invalid JSON in request body',
        cause: exception,
        validationErrors: [{ field: 'body', message: exception.message }],
      });
    }
  }
  return exception;
}

@Catch()
export class OnionExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, body } = mapErrorToResponse(normalizeBodyParseError(exception));
    response.status(status).json(body);
  }
}
