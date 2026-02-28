/**
 * @fileoverview Shared types for HTTP error handling.
 *
 * @module http/shared/types
 */

/**
 * Individual field error for validation failures.
 */
export interface ErrorItem {
  /**
   * Field path (e.g., 'body.name', 'query.page').
   */
  readonly item: string;

  /**
   * Error message for this field.
   */
  readonly message: string;
}

/**
 * Error response body structure.
 */
export interface ErrorResponseBody {
  /**
   * Human-readable error message.
   */
  readonly message: string;

  /**
   * Machine-readable error code.
   */
  readonly errorCode: string;

  /**
   * Field-level validation errors (for validation failures).
   */
  readonly errorItems?: readonly ErrorItem[];
}

/**
 * Mapped error response with status code and body.
 */
export interface MappedErrorResponse {
  /**
   * HTTP status code.
   */
  readonly status: number;

  /**
   * Response body.
   */
  readonly body: ErrorResponseBody;
}
