import type { BoundValidator } from '../../../../global/interfaces/ports/object-validator.port';
import { requestDtoValidationMiddleware } from '../middlewares/validate-request.middleware';
import { CodedError } from '../../../../global/exceptions/coded-error.error';
import { ControllerError } from '../../../exceptions/controller.error';

/**
 * Decorator that validates incoming requests before executing the controller method.
 */
export const SKIP_REQUEST_VALIDATION = 'skip request validation' as const;

type ValidatorFromInstance = {
  fromInstance: (instance: unknown) => BoundValidator | typeof SKIP_REQUEST_VALIDATION;
};

type ValidatorOrGetter =
  | BoundValidator
  | typeof SKIP_REQUEST_VALIDATION
  | ValidatorFromInstance;

export const requestValidatorFromInstance = (
  getter: (instance: unknown) => BoundValidator | typeof SKIP_REQUEST_VALIDATION,
): ValidatorFromInstance => ({
  fromInstance: getter,
});

const resolveValidator = (
  validatorOrGetter: ValidatorOrGetter,
  instance: unknown,
): BoundValidator | typeof SKIP_REQUEST_VALIDATION => {
  return typeof validatorOrGetter === 'object' &&
    validatorOrGetter !== null &&
    'fromInstance' in validatorOrGetter
    ? validatorOrGetter.fromInstance(instance)
    : validatorOrGetter;
};

export const ValidateRequest = <T>(validatorOrGetter: ValidatorOrGetter) => {
  return <This, Args extends [T, ...unknown[]], Return>(
    value: (this: This, ...args: Args) => Promise<Return> | Return,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Promise<Return> | Return
    >
  ) => {
    if (context.kind !== "method") {
      throw new Error(
        `@ValidateRequest can only be applied to methods, but ${String(
          context.name
        )} is not a method`
      );
    }

    return async function (this: This, ...args: Args): Promise<Return> {
      try {
        const [request, ...rest] = args;
        const resolvedValidator = resolveValidator(validatorOrGetter, this);
        if (resolvedValidator === SKIP_REQUEST_VALIDATION) {
          console.info(
            "ValidateRequest skipped: request validation explicitly disabled."
          );
          return await value.apply(this, args);
        }
        const validate = requestDtoValidationMiddleware<T>(resolvedValidator);
        const validated = await validate(request);
        return await value.apply(this, [validated, ...rest] as Args);
      } catch (error) {
        if (error instanceof CodedError) {
          throw error;
        }
        throw new ControllerError({
          message:
            error instanceof Error
              ? error.message
              : "Controller validateRequest decorator execution failed",
          cause: error,
        });
      }
    };
  };
};
