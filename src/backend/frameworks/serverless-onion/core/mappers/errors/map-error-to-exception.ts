import { CodedError } from '../../../../../core/global/exceptions/coded-error.error';
import { ObjectValidationError } from '../../../../../core/global/exceptions/object-validation.error';
import { DomainError } from '../../../../../core/onion-layers/domain/exceptions/domain.error';
import { UseCaseError } from '../../../../../core/onion-layers/app/exceptions/use-case.error';
import { NotFoundError } from '../../../../../core/onion-layers/app/exceptions/not-found.error';
import { ConflictError } from '../../../../../core/onion-layers/app/exceptions/conflict.error';
import { UnprocessableError } from '../../../../../core/onion-layers/app/exceptions/unprocessable.error';
import { InfraError } from '../../../../../core/onion-layers/infra/exceptions/infra.error';
import { ControllerError } from '../../../../../core/onion-layers/presentation/exceptions/controller.error';
import { AccessDeniedError } from '../../../../../core/onion-layers/presentation/exceptions/access-denied.error';
import { InvalidRequestError } from '../../../../../core/onion-layers/presentation/exceptions/invalid-request.error';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '../../exceptions';

/**
 * Maps our error hierarchy to HTTP exceptions.
 *
 * Mapping strategy:
 * - `ObjectValidationError` → BadRequestException (400)
 * - `InvalidRequestError` → BadRequestException (400)
 * - `AccessDeniedError` → ForbiddenException (403)
 * - `NotFoundError` → NotFoundException (404)
 * - `ConflictError` → ConflictException (409)
 * - `UnprocessableError` → UnprocessableEntityException (422)
 * - `DomainError` → InternalServerErrorException (500, masked)
 * - `InfraError` → InternalServerErrorException (500, masked)
 * - `UseCaseError` (other) → BadRequestException (400)
 * - `ControllerError` (other) → InternalServerErrorException (500, masked)
 * - Unknown → InternalServerErrorException (500, masked)
 *
 * **Security Note:** Domain and infrastructure errors are masked to avoid
 * leaking internal implementation details.
 *
 * @param error - The error to map
 * @returns An HttpException with the appropriate status code
 *
 * @example
 * ```typescript
 * try {
 *   await useCase.execute(input);
 * } catch (error) {
 *   const httpException = mapErrorToException(error);
 *   return httpException.toResponse();
 * }
 * ```
 */
export function mapErrorToException(error: unknown): HttpException {
  // Already an HttpException - return as-is
  if (error instanceof HttpException) {
    return error;
  }

  // Validation errors → 400 Bad Request
  if (error instanceof ObjectValidationError) {
    return new BadRequestException({
      message: error.message,
      code: error.code,
      cause: error,
      errorItems: error.validationErrors.map((e) => ({
        item: e.field,
        message: e.message,
      })),
    });
  }

  if (error instanceof InvalidRequestError) {
    return new BadRequestException({
      message: error.message,
      code: error.code,
      cause: error,
      errorItems: error.validationErrors.map((e) => ({
        item: e.field,
        message: e.message,
      })),
    });
  }

  // Access control → 403 Forbidden
  if (error instanceof AccessDeniedError) {
    return new ForbiddenException({
      message: error.message,
      code: error.code,
      cause: error,
    });
  }

  // Use case errors → specific HTTP status codes
  if (error instanceof NotFoundError) {
    return new NotFoundException({
      message: error.message,
      code: error.code,
      cause: error,
    });
  }

  if (error instanceof ConflictError) {
    return new ConflictException({
      message: error.message,
      code: error.code,
      cause: error,
    });
  }

  if (error instanceof UnprocessableError) {
    return new UnprocessableEntityException({
      message: error.message,
      code: error.code,
      cause: error,
    });
  }

  // Other use case errors → 400 Bad Request
  if (error instanceof UseCaseError) {
    return new BadRequestException({
      message: error.message,
      code: error.code,
      cause: error,
    });
  }

  // Domain errors → 500 Internal Server Error (masked)
  // Note: Logging is handled by the exception handler wrapper to avoid double-logging
  if (error instanceof DomainError) {
    return new InternalServerErrorException({
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      cause: error,
    });
  }

  // Infrastructure errors → 500 Internal Server Error (masked)
  if (error instanceof InfraError) {
    return new InternalServerErrorException({
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      cause: error,
    });
  }

  // Controller errors → 500 Internal Server Error (masked)
  if (error instanceof ControllerError) {
    return new InternalServerErrorException({
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      cause: error,
    });
  }

  // CodedError (catch-all for known errors) → 500 (masked)
  if (error instanceof CodedError) {
    return new InternalServerErrorException({
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      cause: error,
    });
  }

  // Unknown errors → 500 Internal Server Error (masked)
  return new InternalServerErrorException({
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    cause: error,
  });
}
