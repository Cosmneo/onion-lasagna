import { ErrorCodes, type AppErrorCode } from '../../../global/exceptions/error-codes.const';
import { UseCaseError } from './use-case.error';

/**
 * Error thrown when authorization for an operation is denied.
 *
 * Indicates that the user is authenticated but lacks permission to perform
 * the requested operation. Commonly thrown from the `authorize()` method
 * of use cases when access checks fail.
 *
 * **When to throw:**
 * - User doesn't own the resource they're trying to modify
 * - User lacks required role or permission
 * - Organization/tenant isolation violation
 * - Business rule restricts the operation for this user
 *
 * **Difference from AccessDeniedError:**
 * - `ForbiddenError` is an application layer error (use case authorization)
 * - `AccessDeniedError` is a presentation layer error (controller/guard level)
 *
 * @example Use case authorization
 * ```typescript
 * class UpdateActivityUseCase extends BaseInboundAdapter<Input, Output, AuthContext> {
 *   protected async authorize(input: Input): Promise<AuthContext> {
 *     const activity = await this.activityRepo.findById(input.activityId);
 *     if (!activity) {
 *       throw new NotFoundError({ message: 'Activity not found' });
 *     }
 *     if (activity.organizationId !== input.organizationId) {
 *       throw new ForbiddenError({
 *         message: 'Not authorized to modify this activity',
 *         code: 'ACTIVITY_ACCESS_DENIED',
 *       });
 *     }
 *     return { activity };
 *   }
 * }
 * ```
 *
 * @example Role-based authorization
 * ```typescript
 * if (!user.roles.includes('admin')) {
 *   throw new ForbiddenError({
 *     message: 'Admin role required for this operation',
 *   });
 * }
 * ```
 *
 * @extends UseCaseError
 */
export class ForbiddenError extends UseCaseError {
  /**
   * Creates a new ForbiddenError instance.
   *
   * @param options - Error configuration
   * @param options.message - Description of why authorization was denied
   * @param options.code - Machine-readable error code (default: 'FORBIDDEN')
   * @param options.cause - Optional underlying error
   */
  constructor({
    message,
    code = ErrorCodes.App.FORBIDDEN,
    cause,
  }: {
    message: string;
    code?: AppErrorCode | string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }

  /**
   * Creates a ForbiddenError from a caught error.
   *
   * @param cause - The original caught error
   * @returns A new ForbiddenError instance with the cause attached
   */
  static override fromError(cause: unknown): ForbiddenError {
    return new ForbiddenError({
      message: cause instanceof Error ? cause.message : 'Operation forbidden',
      cause,
    });
  }
}
