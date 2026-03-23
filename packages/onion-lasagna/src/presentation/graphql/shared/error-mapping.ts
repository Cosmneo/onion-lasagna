/**
 * @fileoverview Centralized error mapping for GraphQL resolvers.
 *
 * Maps onion-lasagna errors to GraphQL error extensions,
 * following the same pattern as the HTTP error mapper.
 *
 * @module graphql/shared/error-mapping
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
import { AccessDeniedError } from '../../exceptions/access-denied.error';
import { isErrorType, hasValidationErrors } from '../../http/shared/error-mapping';
import type { GraphQLErrorCode, MappedGraphQLError, GraphQLValidationErrorItem } from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default masked error for internal errors.
 */
const MASKED_ERROR: MappedGraphQLError = {
  message: 'An unexpected error occurred',
  extensions: { code: 'INTERNAL_ERROR' },
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

// ============================================================================
// Extension Code Mapping
// ============================================================================

/**
 * Gets the GraphQL extension code for an error.
 * Uses instanceof first, then falls back to name-based checking for bundled code.
 */
export function getGraphQLErrorCode(error: unknown): GraphQLErrorCode {
  // Try instanceof first (faster)
  if (error instanceof ObjectValidationError) return 'VALIDATION_ERROR';
  if (error instanceof UnauthorizedError) return 'FORBIDDEN';
  if (error instanceof ForbiddenError) return 'FORBIDDEN';
  if (error instanceof AccessDeniedError) return 'FORBIDDEN';
  if (error instanceof NotFoundError) return 'NOT_FOUND';
  if (error instanceof ConflictError) return 'CONFLICT';
  if (error instanceof UnprocessableError) return 'UNPROCESSABLE';
  if (error instanceof UseCaseError) return 'BAD_REQUEST';

  // Fall back to name-based checking for bundled code
  if (isErrorType(error, 'ObjectValidationError')) return 'VALIDATION_ERROR';
  if (isErrorType(error, 'UnauthorizedError')) return 'FORBIDDEN';
  if (isErrorType(error, 'ForbiddenError')) return 'FORBIDDEN';
  if (isErrorType(error, 'AccessDeniedError')) return 'FORBIDDEN';
  if (isErrorType(error, 'NotFoundError')) return 'NOT_FOUND';
  if (isErrorType(error, 'ConflictError')) return 'CONFLICT';
  if (isErrorType(error, 'UnprocessableError')) return 'UNPROCESSABLE';
  if (isErrorType(error, 'UseCaseError')) return 'BAD_REQUEST';

  return 'INTERNAL_ERROR';
}

/**
 * Checks if an error should have its details masked.
 *
 * Security-sensitive errors (domain, infrastructure) are masked
 * to prevent leaking implementation details.
 */
export function shouldMaskGraphQLError(error: unknown): boolean {
  // Try instanceof first (faster)
  if (error instanceof DomainError || error instanceof InfraError) {
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

// ============================================================================
// Primary Mapping Function
// ============================================================================

/**
 * Maps an error to a GraphQL error with extensions.
 *
 * Mapping strategy (checked in order):
 * 1. `ObjectValidationError` → `VALIDATION_ERROR` (with field errors)
 * 2. `UnauthorizedError` / `ForbiddenError` / `AccessDeniedError` → `FORBIDDEN`
 * 3. `NotFoundError` → `NOT_FOUND`
 * 4. `ConflictError` → `CONFLICT`
 * 5. `UnprocessableError` → `UNPROCESSABLE`
 * 6. `UseCaseError` → `BAD_REQUEST`
 * 7. `DomainError` / `InfraError` → `INTERNAL_ERROR` (masked)
 * 8. Unknown → `INTERNAL_ERROR` (masked)
 *
 * @param error - The error to map
 * @returns Mapped GraphQL error with message and extensions
 */
export function mapErrorToGraphQLError(error: unknown): MappedGraphQLError {
  // Masked errors - hide internal details
  if (shouldMaskGraphQLError(error)) {
    return MASKED_ERROR;
  }

  const code = getGraphQLErrorCode(error);

  // Validation errors - include field details
  if (error instanceof ObjectValidationError) {
    return buildValidationError(error.message, code, error.code, error.validationErrors);
  }

  // Validation errors - fall back to name-based checking for bundled code
  if (isErrorType(error, 'ObjectValidationError') && hasValidationErrors(error)) {
    return buildValidationError(error.message, code, error.code, error.validationErrors);
  }

  // Other coded errors - expose message
  if (error instanceof CodedError) {
    return {
      message: error.message,
      extensions: { code, originalCode: error.code },
    };
  }

  // Other coded errors - fall back to name-based checking
  if (isErrorType(error, 'CodedError')) {
    return {
      message: error.message,
      extensions: { code, originalCode: error.code },
    };
  }

  // Check for any error with message and code properties
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    'code' in error &&
    typeof (error as { message: string }).message === 'string' &&
    typeof (error as { code: string }).code === 'string'
  ) {
    return {
      message: (error as { message: string }).message,
      extensions: { code, originalCode: (error as { code: string }).code },
    };
  }

  // Unknown errors - mask
  return MASKED_ERROR;
}

/**
 * Builds a validation error response with field details.
 */
function buildValidationError(
  message: string,
  code: GraphQLErrorCode,
  originalCode: string,
  validationErrors: readonly { field: string; message: string }[],
): MappedGraphQLError {
  return {
    message,
    extensions: {
      code,
      originalCode,
      validationErrors: validationErrors.map(
        (e): GraphQLValidationErrorItem => ({
          field: e.field,
          message: e.message,
        }),
      ),
    },
  };
}
