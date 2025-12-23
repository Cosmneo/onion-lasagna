/**
 * Individual error item for detailed validation/error reporting.
 */
export interface ErrorItem {
  /**
   * The field or item that caused the error.
   */
  item: string;

  /**
   * Human-readable error message.
   */
  message: string;
}

/**
 * Standard HTTP exception response shape.
 * Used for all error responses from the API Gateway.
 */
export interface HttpExceptionResponse {
  /**
   * HTTP status code (e.g., 400, 404, 500).
   */
  statusCode: number;

  /**
   * Human-readable error message.
   * For 500 errors, this should be a generic message to avoid leaking internal details.
   */
  message: string;

  /**
   * Machine-readable error code for programmatic handling.
   */
  errorCode: string;

  /**
   * Optional array of detailed error items.
   * Typically used for validation errors to report multiple field-level issues.
   */
  errorItems?: ErrorItem[];
}
