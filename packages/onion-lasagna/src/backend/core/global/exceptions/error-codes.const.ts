/**
 * Centralized registry of all error codes used across the application.
 *
 * Error codes are grouped by architectural layer to maintain clear boundaries
 * and make it easy to identify where an error originated.
 *
 * @example Using error codes in custom errors
 * ```typescript
 * import { ErrorCodes } from '@cosmneo/onion-lasagna/backend/core/global';
 *
 * throw new NotFoundError({
 *   message: 'User not found',
 *   code: ErrorCodes.App.NOT_FOUND,
 * });
 * ```
 *
 * @example Checking error codes programmatically
 * ```typescript
 * if (error.code === ErrorCodes.App.NOT_FOUND) {
 *   // Handle not found case
 * }
 * ```
 */
export const ErrorCodes = {
  /**
   * Domain layer error codes.
   * Used for business rule violations and invariant failures.
   */
  Domain: {
    /** Generic domain error */
    DOMAIN_ERROR: 'DOMAIN_ERROR',
    /** Business invariant was violated */
    INVARIANT_VIOLATION: 'INVARIANT_VIOLATION',
    /** Aggregate was partially loaded (missing required relations) */
    PARTIAL_LOAD: 'PARTIAL_LOAD',
  },

  /**
   * Application layer (use case) error codes.
   * Used for orchestration failures and business operation errors.
   */
  App: {
    /** Generic use case error */
    USE_CASE_ERROR: 'USE_CASE_ERROR',
    /** Requested resource was not found */
    NOT_FOUND: 'NOT_FOUND',
    /** Resource state conflict (e.g., duplicate, already exists) */
    CONFLICT: 'CONFLICT',
    /** Request is valid but cannot be processed due to business rules */
    UNPROCESSABLE: 'UNPROCESSABLE',
    /** Authorization denied - user lacks permission for this operation */
    FORBIDDEN: 'FORBIDDEN',
    /** Authentication required or invalid - user is not authenticated */
    UNAUTHORIZED: 'UNAUTHORIZED',
  },

  /**
   * Infrastructure layer error codes.
   * Used for data access, external services, and I/O failures.
   */
  Infra: {
    /** Generic infrastructure error */
    INFRA_ERROR: 'INFRA_ERROR',
    /** Database operation failed */
    DB_ERROR: 'DB_ERROR',
    /** Network connectivity or communication error */
    NETWORK_ERROR: 'NETWORK_ERROR',
    /** Operation timed out */
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    /** External/third-party service error */
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  },

  /**
   * Presentation layer error codes.
   * Used for controller, request handling, and authorization errors.
   */
  Presentation: {
    /** Generic controller error */
    CONTROLLER_ERROR: 'CONTROLLER_ERROR',
    /** Request denied due to authorization failure */
    ACCESS_DENIED: 'ACCESS_DENIED',
    /** Request validation failed (malformed input) */
    INVALID_REQUEST: 'INVALID_REQUEST',
  },

  /**
   * Global/cross-cutting error codes.
   * Used for validation and other cross-layer concerns.
   */
  Global: {
    /** Object/schema validation failed */
    OBJECT_VALIDATION_ERROR: 'OBJECT_VALIDATION_ERROR',
  },
} as const;

/**
 * Type representing all possible domain error codes.
 */
export type DomainErrorCode = (typeof ErrorCodes.Domain)[keyof typeof ErrorCodes.Domain];

/**
 * Type representing all possible application error codes.
 */
export type AppErrorCode = (typeof ErrorCodes.App)[keyof typeof ErrorCodes.App];

/**
 * Type representing all possible infrastructure error codes.
 */
export type InfraErrorCode = (typeof ErrorCodes.Infra)[keyof typeof ErrorCodes.Infra];

/**
 * Type representing all possible presentation error codes.
 */
export type PresentationErrorCode =
  (typeof ErrorCodes.Presentation)[keyof typeof ErrorCodes.Presentation];

/**
 * Type representing all possible global error codes.
 */
export type GlobalErrorCode = (typeof ErrorCodes.Global)[keyof typeof ErrorCodes.Global];

/**
 * Union type of all error codes across all layers.
 *
 * Use this when you need to accept any valid error code.
 *
 * @example
 * ```typescript
 * function logError(code: ErrorCode, message: string) {
 *   console.error(`[${code}] ${message}`);
 * }
 * ```
 */
export type ErrorCode =
  | DomainErrorCode
  | AppErrorCode
  | InfraErrorCode
  | PresentationErrorCode
  | GlobalErrorCode;
