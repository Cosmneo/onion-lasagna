import type { BoundValidator } from "../../../../global/interfaces/ports/object-validator.port";
import { responseDtoValidationMiddleware } from "../middlewares/validate-response.middleware";
import { CodedError } from "../../../../global/exceptions/coded-error.error";
import { ControllerError } from "../../../exceptions/controller.error";

/**
 * Decorator that validates outgoing responses after executing the controller method.
 */
export const SKIP_RESPONSE_VALIDATION = "skip response validation" as const;

type ValidatorFromInstance = {
  fromInstance: (
    instance: unknown
  ) => BoundValidator | typeof SKIP_RESPONSE_VALIDATION;
};

type ValidatorOrGetter =
  | BoundValidator
  | typeof SKIP_RESPONSE_VALIDATION
  | ValidatorFromInstance;

export const responseValidatorFromInstance = (
  getter: (
    instance: unknown
  ) => BoundValidator | typeof SKIP_RESPONSE_VALIDATION
): ValidatorFromInstance => ({
  fromInstance: getter,
});

const resolveValidator = (
  validatorOrGetter: ValidatorOrGetter,
  instance: unknown
): BoundValidator | typeof SKIP_RESPONSE_VALIDATION => {
  return typeof validatorOrGetter === "object" &&
    validatorOrGetter !== null &&
    "fromInstance" in validatorOrGetter
    ? validatorOrGetter.fromInstance(instance)
    : validatorOrGetter;
};

export const ValidateResponse = <T>(validatorOrGetter: ValidatorOrGetter) => {
  return <This, Args extends unknown[], Return>(
    value: (this: This, ...args: Args) => Promise<Return> | Return,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Promise<Return> | Return
    >
  ) => {
    if (context.kind !== "method") {
      throw new Error(
        `@ValidateResponse can only be applied to methods, but ${String(
          context.name
        )} is not a method`
      );
    }

    return async function (this: This, ...args: Args): Promise<Return> {
      try {
        const result = await value.apply(this, args);
        const resolvedValidator = resolveValidator(validatorOrGetter, this);
        if (resolvedValidator === SKIP_RESPONSE_VALIDATION) {
          console.info(
            "ValidateResponse skipped: response validation explicitly disabled."
          );
          return result;
        }
        const validate = responseDtoValidationMiddleware<T>(resolvedValidator);
        return (await validate(result)) as Return;
      } catch (error) {
        if (error instanceof CodedError) {
          throw error;
        }
        throw new ControllerError({
          message:
            error instanceof Error
              ? error.message
              : "Controller validateResponse decorator execution failed",
          cause: error,
        });
      }
    };
  };
};
