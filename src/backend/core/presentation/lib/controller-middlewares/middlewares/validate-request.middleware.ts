import type { BoundValidator } from '../../../../global/interfaces/ports/object-validator.port';
import { ObjectValidationError } from '../../../../global/exceptions/object-validation.error';
import { InvalidRequestError } from '../../../exceptions/invalid-request.error';

/**
 * Validates a request using the injected validator.
 */
export const requestDtoValidationMiddleware = <T>(validator: BoundValidator<T>) => {
  return async (request: unknown): Promise<T> => {
    try {
      return validator.validate(request);
    } catch (error) {
      if (error instanceof ObjectValidationError) {
        throw new InvalidRequestError({
          message: error.message,
          cause: error,
          validationErrors: error.validationErrors,
        });
      }
      throw error;
    }
  };
};
