import { allowRequestMiddleware } from '../middlewares/allow-request.middleware';
import type { AccessGuard } from '../../../interfaces/types/access-guard.type';
import { CodedError } from '../../../../global/exceptions/coded-error.error';
import { ControllerError } from '../../../exceptions/controller.error';

interface AccessGuardFromInstance<T> {
  fromInstance: (instance: unknown) => AccessGuard<T>;
}
type AccessGuardOrGetter<T> = AccessGuard<T> | AccessGuardFromInstance<T>;

export const accessGuardFromInstance = <T>(
  getter: (instance: unknown) => AccessGuard<T>,
): AccessGuardFromInstance<T> => ({
  fromInstance: getter,
});

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
      try {
        const request = args[0];
        const accessGuard =
          'fromInstance' in accessGuardOrGetter
            ? accessGuardOrGetter.fromInstance(this)
            : accessGuardOrGetter;
        const allow = allowRequestMiddleware(accessGuard);
        await allow(request);
        return await value.apply(this, args);
      } catch (error) {
        if (error instanceof CodedError) {
          throw error;
        }
        throw new ControllerError({
          message:
            error instanceof Error
              ? error.message
              : 'Controller allowRequest decorator execution failed',
          cause: error,
        });
      }
    };
  };
};
