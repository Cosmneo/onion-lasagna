/**
 * @fileoverview Error-to-ScheduleResult mapping for scheduled tasks.
 *
 * Maps caught errors to schedule run outcomes (failed/retry). Uses the same
 * name-based type checking as the HTTP error mapper for compatibility with
 * bundled/minified code.
 *
 * CRITICAL: validation/domain failures map to `failed`, NOT `skipped`.
 * `skipped` is ONLY producible by an explicit handler/resultMapper return
 * ("nothing due") — never by error mapping. Error mapping only ever yields
 * `failed` (permanent) or `retry` (transient/unknown — conservative so we
 * never silently lose a run).
 *
 * @module schedule/shared/error-mapping
 */

import { isErrorType } from '../../http/shared/error-mapping';
import type { ScheduleResult } from './types';

// ============================================================================
// Error Type Classifications
// ============================================================================

/**
 * Error types that indicate permanent failures (`failed`).
 * These errors will not resolve on retry.
 * Includes concrete DomainError subclasses so cross-realm name-checks work
 * even when instanceof fails.
 */
const FAILED_ERROR_TYPES = [
  'ObjectValidationError',
  'InvalidRequestError',
  'UseCaseError',
  'DomainError',
  'UnprocessableError',
  'AccessDeniedError',
  'ForbiddenError',
  'UnauthorizedError',
  'InvariantViolationError',
  // DomainError subclasses
  'PartialLoadError',
];

/**
 * Error types that indicate transient failures (`retry`).
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
];

// ============================================================================
// Mapping Function
// ============================================================================

/**
 * Maps a caught error to a ScheduleResult.
 *
 * Default mapping strategy:
 *
 * | Error Type                                      | Outcome | Rationale                              |
 * |-------------------------------------------------|---------|----------------------------------------|
 * | ObjectValidationError, InvalidRequestError      | failed  | Bad payload — retrying won't help      |
 * | UseCaseError                                    | failed  | Business rule rejection — permanent    |
 * | DomainError, InvariantViolationError            | failed  | Domain invariant — permanent           |
 * | UnprocessableError                              | failed  | Valid but not processable — permanent  |
 * | AccessDeniedError, ForbiddenError, Unauthorized | failed  | Permission — permanent                 |
 * | PartialLoadError                                | failed  | Domain — permanent                     |
 * | NotFoundError                                   | retry   | Entity might not exist yet             |
 * | ConflictError                                   | retry   | Concurrent write — may resolve         |
 * | InfraError, DbError, NetworkError, TimeoutError | retry   | Infrastructure/transient               |
 * | ExternalServiceError                            | retry   | Downstream transient                   |
 * | Unknown                                         | retry   | Conservative — don't lose runs         |
 *
 * NOTE: `skipped` is NEVER returned here. A run that finds "nothing due" must
 * return `{ outcome: 'skipped', reason }` explicitly from its handler.
 *
 * @param error - The caught error
 * @returns A ScheduleResult indicating how the run should be handled
 */
export function mapErrorToScheduleResult(error: unknown): ScheduleResult {
  // Check failed errors first (permanent failures)
  for (const typeName of FAILED_ERROR_TYPES) {
    if (isErrorType(error, typeName)) {
      return {
        outcome: 'failed',
        reason: (error as { message: string }).message,
        errorType: typeName,
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

  // Unknown errors — retry conservatively to avoid losing runs.
  const message =
    error instanceof Error ? error.message : 'Unknown error occurred during scheduled task run';

  return {
    outcome: 'retry',
    reason: message,
  };
}
