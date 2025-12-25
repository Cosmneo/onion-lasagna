import { Catch, HttpStatus, type ExceptionFilter, type ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Error item for field-level validation errors.
 */
interface ErrorItem {
  item: string;
  message: string;
}

/**
 * Standard error response body.
 */
interface ErrorResponseBody {
  message: string;
  errorCode: string;
  errorItems?: ErrorItem[];
}

/**
 * Validation error structure.
 */
interface ValidationErrorItem {
  field: string;
  message: string;
}

/**
 * Interface for errors with validation items.
 */
interface ErrorWithValidation {
  message: string;
  code: string;
  validationErrors: ValidationErrorItem[];
}

/**
 * Interface for coded errors.
 */
interface CodedErrorLike {
  message: string;
  code: string;
}

/**
 * Checks if error matches a specific error type by checking its constructor name.
 * This approach avoids issues with multiple class instances in bundled code.
 * Handles both original names and tsup's mangled names (prefixed with _).
 */
function isErrorType(error: unknown, typeName: string): error is CodedErrorLike {
  if (!error || typeof error !== 'object') return false;
  const constructor = (error as object).constructor;
  const name = constructor?.name;
  // Check both the original name and the mangled name (tsup prefixes with _)
  return name === typeName || name === `_${typeName}`;
}

/**
 * Checks if error has validation errors array.
 */
function hasValidationErrors(error: unknown): error is ErrorWithValidation {
  if (!error || typeof error !== 'object') return false;
  return (
    'validationErrors' in error && Array.isArray((error as ErrorWithValidation).validationErrors)
  );
}

/**
 * Known internal error type names that should be masked.
 */
const INTERNAL_ERROR_TYPES = [
  'DomainError',
  'InfraError',
  'ControllerError',
  'NetworkError',
  'PersistenceError',
  'ExternalServiceError',
  'InvariantViolationError',
];

/**
 * NestJS exception filter that maps onion-lasagna errors to HTTP responses.
 *
 * Mapping strategy:
 * - `ObjectValidationError` → 400 Bad Request
 * - `InvalidRequestError` → 400 Bad Request
 * - `AccessDeniedError` → 403 Forbidden
 * - `NotFoundError` → 404 Not Found
 * - `ConflictError` → 409 Conflict
 * - `UnprocessableError` → 422 Unprocessable Entity
 * - `UseCaseError` (other) → 400 Bad Request
 * - `DomainError` → 500 Internal Server Error (masked)
 * - `InfraError` → 500 Internal Server Error (masked)
 * - `ControllerError` → 500 Internal Server Error (masked)
 * - Unknown → 500 Internal Server Error (masked)
 *
 * **Security Note:** Domain and infrastructure errors are masked to avoid
 * leaking internal implementation details.
 *
 * @example
 * ```typescript
 * import { Controller, UseFilters } from '@nestjs/common';
 * import { OnionExceptionFilter } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
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
 * import { OnionExceptionFilter } from '@cosmneo/onion-lasagna/backend/frameworks/nestjs';
 *
 * const app = await NestFactory.create(AppModule);
 * app.useGlobalFilters(new OnionExceptionFilter());
 * ```
 */
@Catch()
export class OnionExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, body } = this.mapError(exception);
    response.status(status).json(body);
  }

  private mapError(error: unknown): { status: number; body: ErrorResponseBody } {
    // Validation errors → 400 Bad Request
    if (isErrorType(error, 'ObjectValidationError') && hasValidationErrors(error)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          message: error.message,
          errorCode: error.code,
          errorItems: error.validationErrors.map((e) => ({
            item: e.field,
            message: e.message,
          })),
        },
      };
    }

    if (isErrorType(error, 'InvalidRequestError') && hasValidationErrors(error)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          message: error.message,
          errorCode: error.code,
          errorItems: error.validationErrors.map((e) => ({
            item: e.field,
            message: e.message,
          })),
        },
      };
    }

    // Access control → 403 Forbidden
    if (isErrorType(error, 'AccessDeniedError')) {
      return {
        status: HttpStatus.FORBIDDEN,
        body: { message: error.message, errorCode: error.code },
      };
    }

    // Use case errors → specific HTTP status codes
    if (isErrorType(error, 'NotFoundError')) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: { message: error.message, errorCode: error.code },
      };
    }

    if (isErrorType(error, 'ConflictError')) {
      return {
        status: HttpStatus.CONFLICT,
        body: { message: error.message, errorCode: error.code },
      };
    }

    if (isErrorType(error, 'UnprocessableError')) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        body: { message: error.message, errorCode: error.code },
      };
    }

    // Other use case errors → 400 Bad Request
    if (isErrorType(error, 'UseCaseError')) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: { message: error.message, errorCode: error.code },
      };
    }

    // Internal errors → 500 (masked)
    for (const errorType of INTERNAL_ERROR_TYPES) {
      if (isErrorType(error, errorType)) {
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          body: { message: 'An unexpected error occurred', errorCode: 'INTERNAL_ERROR' },
        };
      }
    }

    // CodedError (catch-all for known errors) → 500 (masked)
    if (isErrorType(error, 'CodedError')) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: { message: 'An unexpected error occurred', errorCode: 'INTERNAL_ERROR' },
      };
    }

    // Unknown errors → 500 Internal Server Error (masked)
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { message: 'An unexpected error occurred', errorCode: 'INTERNAL_ERROR' },
    };
  }
}
