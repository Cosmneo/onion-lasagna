/**
 * Base error class for all application errors with a machine-readable code.
 *
 * Abstract class that extends the native `Error` with:
 * - A `code` property for programmatic error handling
 * - Optional `cause` for error chaining (ES2022 compatible)
 * - A `fromError` static factory pattern for error transformation
 *
 * **Why abstract:** Prevents non-declarative error usage. All errors must
 * be explicitly defined as subclasses to ensure consistent error taxonomy.
 *
 * @example Subclass implementation
 * ```typescript
 * class DbError extends InfraError {
 *   static override fromError(cause: unknown): DbError {
 *     return new DbError({
 *       message: cause instanceof Error ? cause.message : 'Database error',
 *       cause,
 *     });
 *   }
 * }
 * ```
 *
 * @example Usage with wrapErrorAsync
 * ```typescript
 * await wrapErrorAsync(
 *   () => this.db.query(...),
 *   DbError.fromError,
 * );
 * ```
 */
export abstract class CodedError extends Error {
  /** Machine-readable error code for programmatic handling. */
  public readonly code: string;

  /**
   * Creates a new CodedError instance.
   *
   * @param options - Error configuration
   * @param options.message - Human-readable error message
   * @param options.code - Machine-readable error code (e.g., 'USER_NOT_FOUND')
   * @param options.cause - Optional underlying error that caused this error
   */
  constructor({ message, code, cause }: { message: string; code: string; cause?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    if (cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        value: cause,
        writable: false,
        enumerable: false,
        configurable: true,
      });
    }
  }

  /**
   * Factory method to create a typed error from a caught error.
   *
   * Subclasses should override this to provide proper error transformation.
   * Designed for use with {@link wrapErrorAsync} and {@link wrapError}.
   *
   * @param _cause - The original caught error
   * @returns A new CodedError instance
   * @throws {Error} If not overridden by subclass
   *
   * @example
   * ```typescript
   * class NotFoundError extends UseCaseError {
   *   static override fromError(cause: unknown): NotFoundError {
   *     return new NotFoundError({
   *       message: 'Resource not found',
   *       cause,
   *     });
   *   }
   * }
   * ```
   */
  static fromError(_cause: unknown): CodedError {
    throw new Error(`${this.name}.fromError() must be implemented by subclass`);
  }
}
