/**
 * AllowRequest decorator for controller access control.
 *
 * Provides a declarative way to add authorization checks to controller methods.
 * The decorator intercepts method calls, runs the access guard before execution,
 * and throws {@link AccessDeniedError} if access is denied.
 *
 * **Flow:**
 * 1. Decorator intercepts method call
 * 2. Extracts request from first argument
 * 3. Runs access guard (sync or async)
 * 4. If `isAllowed: false`, throws {@link AccessDeniedError}
 * 5. If `isAllowed: true`, executes the original method
 *
 * @example Basic usage with inline guard
 * ```typescript
 * class UserController extends GuardedController<Request, Response> {
 *   @AllowRequest<Request>(async (req) => ({
 *     isAllowed: req.user?.role === 'admin',
 *     reason: 'Admin access required',
 *   }))
 *   async execute(input: Request): Promise<Response> {
 *     // Only runs if access guard passes
 *   }
 * }
 * ```
 *
 * @example Using accessGuardFromInstance for dependency injection
 * ```typescript
 * class UserController extends GuardedController<Request, Response> {
 *   constructor(private authService: AuthService) {}
 *
 *   @AllowRequest(accessGuardFromInstance<Request>((instance) => {
 *     const controller = instance as UserController;
 *     return (req) => controller.authService.checkAccess(req);
 *   }))
 *   async execute(input: Request): Promise<Response> {
 *     // Access guard uses injected authService
 *   }
 * }
 * ```
 *
 * @module
 */
import { allowRequestMiddleware } from '../middlewares/allow-request.middleware';
import type { AccessGuard } from '../../../interfaces/types/access-guard.type';
import { CodedError } from '../../../../../global/exceptions/coded-error.error';
import { wrapErrorUnlessAsync } from '../../../../../global/utils/wrap-error.util';
import { ControllerError } from '../../../exceptions/controller.error';

/**
 * Wrapper type for access guards that need controller instance access.
 *
 * @typeParam T - The request type being guarded
 */
interface AccessGuardFromInstance<T> {
  fromInstance: (instance: unknown) => AccessGuard<T>;
}

/**
 * Union type accepting either a direct access guard or an instance-based getter.
 *
 * @typeParam T - The request type being guarded
 */
type AccessGuardOrGetter<T> = AccessGuard<T> | AccessGuardFromInstance<T>;

/**
 * Creates an access guard that has access to the controller instance.
 *
 * Use this when your access guard needs to access controller properties
 * like injected services or configuration.
 *
 * @typeParam T - The request type being guarded
 * @param getter - Function that receives the controller instance and returns an AccessGuard
 * @returns An AccessGuardFromInstance wrapper for use with @AllowRequest
 *
 * @example
 * ```typescript
 * @AllowRequest(accessGuardFromInstance<Request>((instance) => {
 *   const ctrl = instance as MyController;
 *   return async (req) => ({
 *     isAllowed: await ctrl.authService.canAccess(req.userId),
 *   });
 * }))
 * ```
 */
export const accessGuardFromInstance = <T>(
  getter: (instance: unknown) => AccessGuard<T>,
): AccessGuardFromInstance<T> => ({
  fromInstance: getter,
});

/**
 * Method decorator that enforces access control before method execution.
 *
 * @typeParam T - The request type (inferred from first method argument)
 * @param accessGuardOrGetter - Either an {@link AccessGuard} function or
 *   an {@link AccessGuardFromInstance} wrapper created by {@link accessGuardFromInstance}
 * @returns A method decorator that wraps the original method with access control
 *
 * @throws {AccessDeniedError} When the access guard returns `isAllowed: false`
 * @throws {ControllerError} When an unexpected error occurs during guard execution
 *
 * @example
 * ```typescript
 * @AllowRequest<Request>(async (req) => ({
 *   isAllowed: req.user != null,
 *   reason: 'Authentication required',
 * }))
 * async execute(input: Request): Promise<Response> { ... }
 * ```
 */
export const AllowRequest = <T = unknown>(accessGuardOrGetter: AccessGuardOrGetter<T>) => {
  return <This, Args extends [T, ...unknown[]], Return>(
    value: (this: This, ...args: Args) => Promise<Return> | Return,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Promise<Return> | Return
    >,
  ) => {
    if (context.kind !== 'method') {
      throw new Error(
        `@AllowRequest can only be applied to methods, but ${String(context.name)} is not a method`,
      );
    }

    return async function (this: This, ...args: Args): Promise<Return> {
      return wrapErrorUnlessAsync(
        async () => {
          const request = args[0];
          const accessGuard =
            'fromInstance' in accessGuardOrGetter
              ? accessGuardOrGetter.fromInstance(this)
              : accessGuardOrGetter;
          const allow = allowRequestMiddleware(accessGuard);
          await allow(request);
          return await value.apply(this, args);
        },
        (cause) =>
          new ControllerError({
            message:
              cause instanceof Error
                ? cause.message
                : 'Controller allowRequest decorator execution failed',
            cause,
          }),
        [CodedError],
      );
    };
  };
};
