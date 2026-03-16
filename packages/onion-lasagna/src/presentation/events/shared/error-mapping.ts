/**
 * @fileoverview Error-to-EventResult mapping for event handlers.
 *
 * Maps caught errors to event processing outcomes (ack/retry/dlq).
 * Uses the same name-based type checking as the HTTP error mapper
 * for compatibility with bundled/minified code.
 *
 * @module events/shared/error-mapping
 */

import { isErrorType } from '../../http/shared/error-mapping';
import type { EventResult } from './types';

// ============================================================================
// Error Type Classifications
// ============================================================================

/**
 * Error types that indicate permanent failures (send to DLQ).
 * These errors will not resolve on retry.
 */
const DLQ_ERROR_TYPES = [
  'ObjectValidationError',
  'InvalidRequestError',
  'UseCaseError',
  'DomainError',
  'UnprocessableError',
  'AccessDeniedError',
  'ForbiddenError',
  'UnauthorizedError',
  'InvariantViolationError',
];

/**
 * Error types that indicate transient failures (retry).
 * These errors may resolve on subsequent attempts.
 */
const RETRY_ERROR_TYPES = [
  'NotFoundError',
  'ConflictError',
  'InfraError',
  'DbError',
  'NetworkError',
  'TimeoutError',
  'ExternalServiceError',
  'PersistenceError',
];

// ============================================================================
// Mapping Function
// ============================================================================

/**
 * Maps a caught error to an EventResult.
 *
 * Default mapping strategy:
 *
 * | Error Type                                     | Outcome | Rationale                              |
 * |------------------------------------------------|---------|----------------------------------------|
 * | ObjectValidationError, InvalidRequestError      | dlq     | Bad payload — retrying won't help      |
 * | UseCaseError                                    | dlq     | Business rule rejection — permanent    |
 * | DomainError, InvariantViolationError            | dlq     | Domain invariant — permanent           |
 * | UnprocessableError                              | dlq     | Valid but not processable — permanent  |
 * | AccessDeniedError, ForbiddenError, Unauthorized | dlq     | Permission — permanent                 |
 * | NotFoundError                                   | retry   | Entity might not exist yet             |
 * | ConflictError                                   | retry   | Concurrent write — may resolve         |
 * | InfraError, DbError, NetworkError, TimeoutError | retry   | Infrastructure/transient               |
 * | Unknown                                         | retry   | Conservative — don't lose messages     |
 *
 * @param error - The caught error
 * @returns An EventResult indicating how the message should be handled
 */
export function mapErrorToEventResult(error: unknown): EventResult {
  // Check DLQ errors first (permanent failures)
  for (const typeName of DLQ_ERROR_TYPES) {
    if (isErrorType(error, typeName)) {
      return {
        outcome: 'dlq',
        reason: (error as { message: string }).message,
      };
    }
  }

  // Check retry errors (transient failures)
  for (const typeName of RETRY_ERROR_TYPES) {
    if (isErrorType(error, typeName)) {
      return {
        outcome: 'retry',
        reason: (error as { message: string }).message,
      };
    }
  }

  // Unknown errors — retry conservatively to avoid losing messages
  const message =
    error instanceof Error ? error.message : 'Unknown error occurred during event processing';

  return {
    outcome: 'retry',
    reason: message,
  };
}
