import { InfraError } from './infra.error';

/**
 * Error thrown when a database operation fails.
 *
 * Wraps database-specific errors (connection failures, query errors,
 * constraint violations) into a transport-agnostic infrastructure error.
 *
 * **When to throw:**
 * - Database connection lost
 * - Query execution failed
 * - Transaction rollback
 * - Constraint violation (unique, foreign key)
 *
 * @example
 * ```typescript
 * try {
 *   await this.db.query('SELECT * FROM users');
 * } catch (error) {
 *   throw new DbError({
 *     message: 'Failed to fetch users',
 *     code: 'USER_QUERY_FAILED',
 *     cause: error,
 *   });
 * }
 * ```
 *
 * @extends InfraError
 */
export class DbError extends InfraError {
  /**
   * Creates a new DbError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of the database failure
   * @param options.code - Machine-readable error code (default: 'DB_ERROR')
   * @param options.cause - Optional underlying database error
   */
  constructor({
    message,
    code = 'DB_ERROR',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates a DbError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new DbError instance with the cause attached
   */
  static override fromError(cause: unknown): DbError {
    return new DbError({
      message: cause instanceof Error ? cause.message : 'Database error',
      cause,
    });
  }
}
