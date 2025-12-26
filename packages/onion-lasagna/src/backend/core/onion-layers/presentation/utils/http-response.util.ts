import type { HttpResponse } from '../interfaces/types/http/http-response';

/**
 * Type guard to validate that a value is a valid HttpResponse.
 *
 * Checks that the value has the required `statusCode` property as a number.
 * This is used to validate controller outputs before passing to response mappers.
 *
 * @param value - The value to check
 * @returns True if the value is a valid HttpResponse
 *
 * @example
 * ```typescript
 * const output = controller.execute(input);
 * if (!isHttpResponse(output)) {
 *   throw new Error('Controller must return an HttpResponse');
 * }
 * ```
 */
export function isHttpResponse(value: unknown): value is HttpResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    typeof (value as { statusCode: unknown }).statusCode === 'number'
  );
}

/**
 * Asserts that a value is a valid HttpResponse.
 *
 * Throws a descriptive error if the value is not a valid HttpResponse,
 * making it easier to debug controller output issues.
 *
 * @param value - The value to validate
 * @param context - Optional context for the error message (e.g., 'mapOutput')
 * @throws Error if the value is not a valid HttpResponse
 *
 * @example
 * ```typescript
 * const output = controller.execute(input);
 * assertHttpResponse(output, 'controller output');
 * // Now TypeScript knows output is HttpResponse
 * ```
 */
export function assertHttpResponse(
  value: unknown,
  context = 'value',
): asserts value is HttpResponse {
  if (!isHttpResponse(value)) {
    const actualType = value === null ? 'null' : value === undefined ? 'undefined' : typeof value;
    const hasStatusCode = typeof value === 'object' && value !== null && 'statusCode' in value;

    let message = `Expected ${context} to be an HttpResponse with a numeric statusCode, `;

    if (hasStatusCode) {
      const statusCodeType = typeof (value as { statusCode: unknown })['statusCode'];
      message += `but statusCode was ${statusCodeType}`;
    } else {
      message += `but got ${actualType}`;
    }

    throw new Error(message);
  }
}
