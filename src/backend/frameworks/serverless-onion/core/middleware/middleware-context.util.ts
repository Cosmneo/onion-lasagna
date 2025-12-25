/**
 * Type guard to check if a value is a valid middleware context object.
 *
 * A valid middleware context is a non-null object. Arrays are technically
 * objects but are not valid contexts (they would spread incorrectly).
 *
 * @param value - The value to check
 * @returns True if the value is a valid middleware context object
 *
 * @example
 * ```typescript
 * isMiddlewareContext({ userId: '123' }); // true
 * isMiddlewareContext({}); // true (empty context is valid)
 * isMiddlewareContext(null); // false
 * isMiddlewareContext(undefined); // false
 * isMiddlewareContext([]); // false (arrays are not valid contexts)
 * isMiddlewareContext('string'); // false
 * ```
 */
export function isMiddlewareContext(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Asserts that a value is a valid middleware context object.
 *
 * Throws a descriptive error if the middleware returned an invalid value,
 * helping developers quickly identify and fix the issue.
 *
 * @param value - The value to validate
 * @param middlewareIndex - The index of the middleware in the chain (for error messages)
 * @throws Error if the value is not a valid middleware context
 *
 * @example
 * ```typescript
 * // Valid - no error thrown
 * assertMiddlewareContext({ userId: '123' }, 0);
 * assertMiddlewareContext({}, 1); // Empty context is valid
 *
 * // Invalid - throws descriptive error
 * assertMiddlewareContext(undefined, 0);
 * // Error: Middleware at index 0 returned undefined instead of a context object.
 * // Middlewares must return an object (use {} for no additional context) or throw an exception to abort the request.
 *
 * assertMiddlewareContext(null, 1);
 * // Error: Middleware at index 1 returned null instead of a context object.
 * // If you intended to abort the request, throw an exception (e.g., UnauthorizedException) instead.
 * ```
 */
export function assertMiddlewareContext(
  value: unknown,
  middlewareIndex: number,
): asserts value is object {
  if (value === undefined) {
    throw new Error(
      `Middleware at index ${middlewareIndex} returned undefined instead of a context object. ` +
        'Middlewares must return an object (use {} for no additional context) or throw an exception to abort the request.',
    );
  }

  if (value === null) {
    throw new Error(
      `Middleware at index ${middlewareIndex} returned null instead of a context object. ` +
        'If you intended to abort the request, throw an exception (e.g., UnauthorizedException) instead.',
    );
  }

  if (Array.isArray(value)) {
    throw new Error(
      `Middleware at index ${middlewareIndex} returned an array instead of a context object. ` +
        'Middlewares must return a plain object with context properties.',
    );
  }

  if (typeof value !== 'object') {
    throw new Error(
      `Middleware at index ${middlewareIndex} returned ${typeof value} instead of a context object. ` +
        'Middlewares must return an object (use {} for no additional context) or throw an exception to abort the request.',
    );
  }
}
