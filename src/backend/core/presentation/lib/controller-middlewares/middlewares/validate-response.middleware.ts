import type { BoundValidator } from '../../../../global/interfaces/ports/object-validator.port';

/**
 * Validates a response using the injected validator.
 */
export const responseDtoValidationMiddleware = <T>(validator: BoundValidator<T>) => {
  return async (response: unknown): Promise<T> => {
    return validator.validate(response);
  };
};
