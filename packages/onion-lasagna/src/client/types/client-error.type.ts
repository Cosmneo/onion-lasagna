/**
 * Error thrown by the typed HTTP client.
 * Contains structured information about the failure.
 */
export class ClientError extends Error {
  /**
   * Name of the error class.
   */
  public override readonly name = 'ClientError';

  /**
   * Creates a new ClientError.
   *
   * @param message - Human-readable error message
   * @param status - HTTP status code (0 for network errors)
   * @param code - Application-specific error code (optional)
   * @param details - Additional error details from the server (optional)
   */
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ClientError);
    }
  }

  /**
   * Create a ClientError from a network failure.
   */
  static networkError(message: string, cause?: Error): ClientError {
    const error = new ClientError(message, 0, 'NETWORK_ERROR');
    if (cause) {
      error.cause = cause;
    }
    return error;
  }

  /**
   * Create a ClientError from a timeout.
   */
  static timeoutError(url: string, timeout: number): ClientError {
    return new ClientError(`Request to ${url} timed out after ${timeout}ms`, 0, 'TIMEOUT_ERROR');
  }

  /**
   * Create a ClientError from an HTTP response.
   */
  static fromResponse(status: number, body: unknown): ClientError {
    const message = extractErrorMessage(body) ?? `Request failed with status ${status}`;
    const code = extractErrorCode(body);
    return new ClientError(message, status, code, body);
  }

  /**
   * Check if this is a network error (no HTTP status).
   */
  isNetworkError(): boolean {
    return this.status === 0;
  }

  /**
   * Check if this is a client error (4xx status).
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if this is a server error (5xx status).
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if this error should be retried.
   * By default, retries network errors and 5xx errors.
   */
  shouldRetry(): boolean {
    return this.isNetworkError() || this.isServerError();
  }

  /**
   * Convert to a plain object for serialization.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Extract error message from various response body formats.
 */
function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === 'string') return body;
  if (typeof body !== 'object' || body === null) return undefined;

  const obj = body as Record<string, unknown>;

  // Common error message field names
  if (typeof obj['message'] === 'string') return obj['message'];
  if (typeof obj['error'] === 'string') return obj['error'];
  if (typeof obj['errorMessage'] === 'string') return obj['errorMessage'];

  // Nested error object
  if (typeof obj['error'] === 'object' && obj['error'] !== null) {
    const errorObj = obj['error'] as Record<string, unknown>;
    if (typeof errorObj['message'] === 'string') return errorObj['message'];
  }

  return undefined;
}

/**
 * Extract error code from various response body formats.
 */
function extractErrorCode(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;

  const obj = body as Record<string, unknown>;

  // Common error code field names
  if (typeof obj['code'] === 'string') return obj['code'];
  if (typeof obj['errorCode'] === 'string') return obj['errorCode'];

  // Nested error object
  if (typeof obj['error'] === 'object' && obj['error'] !== null) {
    const errorObj = obj['error'] as Record<string, unknown>;
    if (typeof errorObj['code'] === 'string') return errorObj['code'];
  }

  return undefined;
}
