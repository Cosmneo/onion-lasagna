import type { ErrorCode } from './error-codes.const';

/**
 * Stable symbol used to brand CodedError instances with their type name.
 *
 * Using `Symbol.for` ensures the same symbol is shared across realms (e.g.
 * multiple copies of the library loaded in a bundle) and survives
 * minification — the string key is a source literal, not derived from
 * `constructor.name`.
 */
export const CODED_ERROR_TYPE = Symbol.for('onion-lasagna.error.type');

/**
 * Retrieves the stable error-type brand from an unknown value.
 *
 * Returns `undefined` when the value is not a branded `CodedError` instance
 * (null, primitives, plain objects, non-CodedError errors, etc.).
 *
 * @param error - Any value (typically a caught error)
 * @returns The branded type name, or `undefined` if absent
 */
export function getErrorTypeName(error: unknown): string | undefined {
  return (error as Record<symbol, unknown> | null)?.[CODED_ERROR_TYPE] as string | undefined;
}

/**
 * Base error class for all application errors with a machine-readable code.
 *
 * Abstract class that extends the native `Error` with:
 * - A `code` property for programmatic error handling
 * - Optional `cause` for error chaining (ES2022 compatible)
 * - A `fromError` static factory pattern for error transformation
 * - A stable `CODED_ERROR_TYPE` symbol brand (minification-proof type identity)
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
  public readonly code: ErrorCode | string;

  /**
   * Returns the stable type name for this error class.
   *
   * Override in every concrete subclass with the **literal** class name
   * (e.g. `return 'DbError';`).  The base-class constructor calls
   * `this.errorTypeName` via virtual dispatch, so the subclass value is
   * stamped onto the instance even though `super()` runs first.
   *
   * The value is deliberately a source-level string literal so that
   * minifiers cannot mangle it.
   *
   * A getter (not a `readonly` field) is required here so that JavaScript's
   * prototype-based virtual dispatch forwards to the subclass override even
   * when `super()` has not finished yet.  The `class-literal-property-style`
   * rule is suppressed for this reason.
   */
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  protected get errorTypeName(): string {
    return 'CodedError';
  }

  /**
   * Creates a new CodedError instance.
   *
   * @param options - Error configuration
   * @param options.message - Human-readable error message
   * @param options.code - Machine-readable error code from ErrorCodes registry or custom string
   * @param options.cause - Optional underlying error that caused this error
   */
  constructor({
    message,
    code,
    cause,
  }: {
    message: string;
    code: ErrorCode | string;
    cause?: unknown;
  }) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    // Stamp a minification-proof brand using virtual dispatch so subclass
    // overrides of errorTypeName are picked up even from this base constructor.
    Object.defineProperty(this, CODED_ERROR_TYPE, {
      value: this.errorTypeName,
      enumerable: false,
      writable: false,
      configurable: false,
    });
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
