import type { AccessGuard } from '../../../interfaces/types/access-guard.type';
import { AccessDeniedError } from '../../../exceptions/access-denied.error';

/**
 * Executes an AccessGuard and throws AccessDeniedError if access is denied.
 */
export const allowRequestMiddleware = <T = unknown>(accessGuard: AccessGuard<T>) => {
  return async (request: T): Promise<T> => {
    const result = await accessGuard(request);

    if (!result.isAllowed) {
      throw new AccessDeniedError({
        message: result.reason ?? 'Access denied',
      });
    }

    return request;
  };
};
