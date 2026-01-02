/**
 * @fileoverview Validation result types for schema adapters.
 *
 * These types represent the outcome of schema validation operations,
 * providing a consistent interface across all validation libraries.
 *
 * @module unified/schema/types/validation
 */

/**
 * Represents a single validation error with path and message.
 */
export interface ValidationIssue {
  /**
   * Path to the invalid value in the data structure.
   * Empty array indicates the root value is invalid.
   *
   * @example ['body', 'user', 'email'] - nested object path
   * @example ['items', '0', 'name'] - array element path
   * @example [] - root level error
   */
  readonly path: readonly string[];

  /**
   * Human-readable error message describing the validation failure.
   */
  readonly message: string;

  /**
   * Optional error code for programmatic handling.
   * Codes are library-specific but follow common patterns:
   * - 'required' - missing required field
   * - 'type' - wrong type
   * - 'format' - invalid format (email, uuid, etc.)
   * - 'minimum' / 'maximum' - number out of range
   * - 'minLength' / 'maxLength' - string length violation
   * - 'pattern' - regex pattern mismatch
   * - 'enum' - value not in allowed list
   */
  readonly code?: string;

  /**
   * Expected type or value (when available).
   */
  readonly expected?: string;

  /**
   * Received type or value (when available).
   */
  readonly received?: string;
}

/**
 * Successful validation result containing the validated and typed data.
 */
export interface ValidationSuccess<T> {
  readonly success: true;
  readonly data: T;
}

/**
 * Failed validation result containing all validation issues.
 */
export interface ValidationFailure {
  readonly success: false;
  readonly issues: readonly ValidationIssue[];
}

/**
 * Result of a schema validation operation.
 * Discriminated union that allows type-safe handling of success/failure cases.
 *
 * @example
 * ```typescript
 * const result = schema.validate(data);
 * if (result.success) {
 *   // result.data is typed as T
 *   console.log(result.data);
 * } else {
 *   // result.issues contains validation errors
 *   console.log(result.issues);
 * }
 * ```
 */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Type guard to check if a validation result is successful.
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>,
): result is ValidationSuccess<T> {
  return result.success === true;
}

/**
 * Type guard to check if a validation result is a failure.
 */
export function isValidationFailure<T>(result: ValidationResult<T>): result is ValidationFailure {
  return result.success === false;
}
