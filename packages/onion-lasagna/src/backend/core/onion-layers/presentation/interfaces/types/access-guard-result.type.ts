/**
 * Result returned by an {@link AccessGuard} function.
 *
 * Represents the outcome of an authorization check, indicating whether
 * access should be granted and optionally providing a reason for denial.
 *
 * **Usage with GuardedController:**
 * - If `isAllowed: true`, the controller method executes normally
 * - If `isAllowed: false`, throws {@link AccessDeniedError} with the reason
 *
 * @example Allowing access
 * ```typescript
 * const result: AccessGuardResult = {
 *   isAllowed: true,
 * };
 * ```
 *
 * @example Denying access with reason
 * ```typescript
 * const result: AccessGuardResult = {
 *   isAllowed: false,
 *   reason: 'User does not have admin privileges',
 * };
 * ```
 */
export interface AccessGuardResult {
  /**
   * Whether the request should be allowed to proceed.
   *
   * - `true`: Access granted, method executes
   * - `false`: Access denied, throws {@link AccessDeniedError}
   */
  isAllowed: boolean;

  /**
   * Optional explanation for why access was denied.
   *
   * When `isAllowed` is `false`, this message is passed to
   * {@link AccessDeniedError} and can be returned to the client.
   * Defaults to "Access denied" if not provided.
   */
  reason?: string;
}
