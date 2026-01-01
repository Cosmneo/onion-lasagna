/**
 * @fileoverview Error handling utilities for NestJS framework.
 *
 * Maps onion-lasagna error hierarchy to appropriate HTTP responses.
 * Uses string-based type checking to handle bundling issues.
 *
 * @module http/frameworks/nestjs/error-handler
 */

import { mapErrorToHttpResponseByName } from '../../shared/error-mapping';
import type { MappedErrorResponse } from './types';

/**
 * Maps an error to a status code and response body.
 *
 * Uses string-based type checking to handle bundling issues
 * where `instanceof` checks may fail.
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
 * @param error - The error to map
 * @returns Mapped error response with status code and body
 */
export function mapErrorToResponse(error: unknown): MappedErrorResponse {
  return mapErrorToHttpResponseByName(error);
}
