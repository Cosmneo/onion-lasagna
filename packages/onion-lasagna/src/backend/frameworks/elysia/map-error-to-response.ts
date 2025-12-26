import { CodedError } from '../../core/global/exceptions/coded-error.error';
import { ObjectValidationError } from '../../core/global/exceptions/object-validation.error';
import { DomainError } from '../../core/onion-layers/domain/exceptions/domain.error';
import { UseCaseError } from '../../core/onion-layers/app/exceptions/use-case.error';
import { NotFoundError } from '../../core/onion-layers/app/exceptions/not-found.error';
import { ConflictError } from '../../core/onion-layers/app/exceptions/conflict.error';
import { UnprocessableError } from '../../core/onion-layers/app/exceptions/unprocessable.error';
import { InfraError } from '../../core/onion-layers/infra/exceptions/infra.error';
import { ControllerError } from '../../core/onion-layers/presentation/exceptions/controller.error';
import { AccessDeniedError } from '../../core/onion-layers/presentation/exceptions/access-denied.error';
import { InvalidRequestError } from '../../core/onion-layers/presentation/exceptions/invalid-request.error';

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
export interface ErrorResponseBody {
  message: string;
  errorCode: string;
  errorItems?: ErrorItem[];
}

/**
 * Mapped error response with status code and body.
 */
export interface MappedErrorResponse {
  statusCode: number;
  body: ErrorResponseBody;
}

/**
 * Maps our error hierarchy to HTTP status codes and response bodies.
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
 * @param error - The error to map
 * @returns Mapped error response with status code and body
 */
export function mapErrorToResponse(error: unknown): MappedErrorResponse {
  // Validation errors → 400 Bad Request
  if (error instanceof ObjectValidationError) {
    return {
      statusCode: 400,
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

  if (error instanceof InvalidRequestError) {
    return {
      statusCode: 400,
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
  if (error instanceof AccessDeniedError) {
    return {
      statusCode: 403,
      body: {
        message: error.message,
        errorCode: error.code,
      },
    };
  }

  // Use case errors → specific HTTP status codes
  if (error instanceof NotFoundError) {
    return {
      statusCode: 404,
      body: {
        message: error.message,
        errorCode: error.code,
      },
    };
  }

  if (error instanceof ConflictError) {
    return {
      statusCode: 409,
      body: {
        message: error.message,
        errorCode: error.code,
      },
    };
  }

  if (error instanceof UnprocessableError) {
    return {
      statusCode: 422,
      body: {
        message: error.message,
        errorCode: error.code,
      },
    };
  }

  // Other use case errors → 400 Bad Request
  if (error instanceof UseCaseError) {
    return {
      statusCode: 400,
      body: {
        message: error.message,
        errorCode: error.code,
      },
    };
  }

  // Domain errors → 500 Internal Server Error (masked)
  if (error instanceof DomainError) {
    return {
      statusCode: 500,
      body: {
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      },
    };
  }

  // Infrastructure errors → 500 Internal Server Error (masked)
  if (error instanceof InfraError) {
    return {
      statusCode: 500,
      body: {
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      },
    };
  }

  // Controller errors → 500 Internal Server Error (masked)
  if (error instanceof ControllerError) {
    return {
      statusCode: 500,
      body: {
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      },
    };
  }

  // CodedError (catch-all for known errors) → 500 (masked)
  if (error instanceof CodedError) {
    return {
      statusCode: 500,
      body: {
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      },
    };
  }

  // Unknown errors → 500 Internal Server Error (masked)
  return {
    statusCode: 500,
    body: {
      message: 'An unexpected error occurred',
      errorCode: 'INTERNAL_ERROR',
    },
  };
}
