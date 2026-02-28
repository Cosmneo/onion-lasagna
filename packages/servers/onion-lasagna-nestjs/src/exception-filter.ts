/**
 * @fileoverview NestJS exception filter for onion-lasagna errors.
 *
 * @module http/frameworks/nestjs/exception-filter
 */

import { Catch, type ExceptionFilter, type ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';
import { mapErrorToResponse } from './error-handler';

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
@Catch()
export class OnionExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, body } = mapErrorToResponse(exception);
    response.status(status).json(body);
  }
}
