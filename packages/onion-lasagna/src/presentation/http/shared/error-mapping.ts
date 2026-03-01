/**
 * @fileoverview Centralized error mapping for HTTP frameworks.
 *
 * Provides a single source of truth for mapping onion-lasagna errors
 * to HTTP status codes and response bodies.
 *
 * @module http/shared/error-mapping
 */

import { CodedError } from '../../../global/exceptions/coded-error.error';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';
import { DomainError } from '../../../domain/exceptions/domain.error';
import { UseCaseError } from '../../../app/exceptions/use-case.error';
import { NotFoundError } from '../../../app/exceptions/not-found.error';
import { ConflictError } from '../../../app/exceptions/conflict.error';
import { UnprocessableError } from '../../../app/exceptions/unprocessable.error';
import { ForbiddenError } from '../../../app/exceptions/forbidden.error';
import { UnauthorizedError } from '../../../app/exceptions/unauthorized.error';
import { InfraError } from '../../../infra/exceptions/infra.error';
import { ControllerError } from '../../exceptions/controller.error';
import { AccessDeniedError } from '../../exceptions/access-denied.error';
import { InvalidRequestError } from '../../exceptions/invalid-request.error';
import type { ErrorResponseBody, MappedErrorResponse } from './types';

// ============================================================================
// Constants and Interfaces
// ============================================================================

/**
 * Default masked error response for internal errors.
 */
const MASKED_ERROR_BODY: ErrorResponseBody = {
  message: 'An unexpected error occurred',
  errorCode: 'INTERNAL_ERROR',
};

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
 * Validation error item structure.
 */
interface ValidationErrorInput {
  field: string;
  message: string;
}

/**
 * Validation error structure for string-based checking.
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

// ============================================================================
// String-based type checking helpers (for bundled code compatibility)
// ============================================================================

/**
 * Checks if error matches a specific error type by checking its constructor name.
 * This approach avoids issues with multiple class instances in bundled code.
 * Handles both original names and tsup's mangled names (prefixed with _).
 *
 * @param error - The error to check
 * @param typeName - The error type name to match
 * @returns True if error matches the type name
 */
export function isErrorType(error: unknown, typeName: string): error is CodedErrorLike {
  if (!error || typeof error !== 'object') return false;
  // Guard against objects without constructor (e.g., Object.create(null))
  const constructor = Object.prototype.hasOwnProperty.call(error, 'constructor')
    ? (error as { constructor?: { name?: string } }).constructor
    : Object.getPrototypeOf(error)?.constructor;
  if (!constructor) return false;
  const name = constructor.name;
  // Check both the original name and the mangled name (tsup prefixes with _)
  return name === typeName || name === `_${typeName}`;
}

/**
 * Checks if error has validation errors array.
 *
 * @param error - The error to check
 * @returns True if error has validationErrors property
 */
export function hasValidationErrors(error: unknown): error is ErrorWithValidation {
  if (!error || typeof error !== 'object') return false;
  return (
    'validationErrors' in error && Array.isArray((error as ErrorWithValidation).validationErrors)
  );
}

// ============================================================================
// Response body builders
// ============================================================================

/**
 * Builds a validation error response body from error details.
 *
 * @param message - The error message
 * @param code - The error code
 * @param validationErrors - Array of field validation errors
 * @returns Error response body with errorItems
 */
function buildValidationErrorBody(
  message: string,
  code: string,
  validationErrors: readonly ValidationErrorInput[],
): ErrorResponseBody {
  return {
    message,
    errorCode: code,
    errorItems: validationErrors.map((e) => ({
      item: e.field,
      message: e.message,
    })),
  };
}

/**
 * Builds a simple error response body from error details.
 *
 * @param message - The error message
 * @param code - The error code
 * @returns Error response body
 */
function buildSimpleErrorBody(message: string, code: string): ErrorResponseBody {
  return {
    message,
    errorCode: code,
  };
}

// ============================================================================
// Primary error mapping functions (with bundled code fallback)
// ============================================================================

/**
 * Maps an error to the appropriate HTTP status code.
 * Uses instanceof first, then falls back to name-based checking for bundled code.
 *
 * @param error - The error to map
 * @returns HTTP status code
 */
export function getHttpStatusCode(error: unknown): number {
  // Try instanceof first (faster)
  if (error instanceof ObjectValidationError) return 400;
  if (error instanceof InvalidRequestError) return 400;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof AccessDeniedError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  if (error instanceof UnprocessableError) return 422;
  if (error instanceof UseCaseError) return 400;

  // Fall back to name-based checking for bundled code (e.g., _NotFoundError)
  if (isErrorType(error, 'ObjectValidationError')) return 400;
  if (isErrorType(error, 'InvalidRequestError')) return 400;
  if (isErrorType(error, 'UnauthorizedError')) return 401;
  if (isErrorType(error, 'ForbiddenError')) return 403;
  if (isErrorType(error, 'AccessDeniedError')) return 403;
  if (isErrorType(error, 'NotFoundError')) return 404;
  if (isErrorType(error, 'ConflictError')) return 409;
  if (isErrorType(error, 'UnprocessableError')) return 422;
  if (isErrorType(error, 'UseCaseError')) return 400;

  return 500;
}

/**
 * Checks if an error should have its details masked in the response.
 *
 * Security-sensitive errors (domain, infrastructure, controller) are masked
 * to prevent leaking implementation details.
 * Uses instanceof first, then falls back to name-based checking for bundled code.
 *
 * @param error - The error to check
 * @returns True if error details should be hidden
 */
export function shouldMaskError(error: unknown): boolean {
  // Try instanceof first (faster)
  if (
    error instanceof DomainError ||
    error instanceof InfraError ||
    error instanceof ControllerError
  ) {
    return true;
  }

  // Fall back to name-based checking for bundled code
  for (const errorType of INTERNAL_ERROR_TYPES) {
    if (isErrorType(error, errorType)) {
      return true;
    }
  }

  return false;
}

/**
 * Creates the response body for an error.
 * Uses instanceof first, then falls back to name-based checking for bundled code.
 *
 * @param error - The error to create body for
 * @returns Error response body
 */
export function createErrorResponseBody(error: unknown): ErrorResponseBody {
  // Masked errors - hide internal details
  if (shouldMaskError(error)) {
    return MASKED_ERROR_BODY;
  }

  // Validation errors - include field details (try instanceof first)
  if (error instanceof ObjectValidationError) {
    return buildValidationErrorBody(error.message, error.code, error.validationErrors);
  }
  if (error instanceof InvalidRequestError) {
    return buildValidationErrorBody(error.message, error.code, error.validationErrors);
  }

  // Validation errors - fall back to name-based checking for bundled code
  if (isErrorType(error, 'ObjectValidationError') && hasValidationErrors(error)) {
    return buildValidationErrorBody(error.message, error.code, error.validationErrors);
  }
  if (isErrorType(error, 'InvalidRequestError') && hasValidationErrors(error)) {
    return buildValidationErrorBody(error.message, error.code, error.validationErrors);
  }

  // Other coded errors - expose message and code (try instanceof first)
  if (error instanceof CodedError) {
    return buildSimpleErrorBody(error.message, error.code);
  }

  // Other coded errors - fall back to name-based checking
  if (isErrorType(error, 'CodedError')) {
    return buildSimpleErrorBody(error.message, error.code);
  }

  // Check for any error with message and code properties
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    'code' in error &&
    typeof (error as CodedErrorLike).message === 'string' &&
    typeof (error as CodedErrorLike).code === 'string'
  ) {
    return buildSimpleErrorBody((error as CodedErrorLike).message, (error as CodedErrorLike).code);
  }

  // Unknown errors - mask
  return MASKED_ERROR_BODY;
}

/**
 * Maps an error to a complete HTTP response structure.
 *
 * Mapping strategy (checked in order):
 * 1. `ObjectValidationError` / `InvalidRequestError` → 400 Bad Request (with field errors)
 * 2. `UseCaseError` → 400 Bad Request
 * 3. `UnauthorizedError` → 401 Unauthorized
 * 4. `ForbiddenError` / `AccessDeniedError` → 403 Forbidden
 * 5. `NotFoundError` → 404 Not Found
 * 6. `ConflictError` → 409 Conflict
 * 7. `UnprocessableError` → 422 Unprocessable Entity
 * 8. `DomainError` / `InfraError` / `ControllerError` → 500 Internal Server Error (masked)
 * 9. Unknown → 500 Internal Server Error (masked)
 *
 * @param error - The error to map
 * @returns Mapped error response with status and body
 */
export function mapErrorToHttpResponse(error: unknown): MappedErrorResponse {
  return {
    status: getHttpStatusCode(error),
    body: createErrorResponseBody(error),
  };
}
