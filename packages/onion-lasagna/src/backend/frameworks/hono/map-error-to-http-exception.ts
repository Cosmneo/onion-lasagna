import { HTTPException } from 'hono/http-exception';
import { CodedError } from '../../core/global/exceptions/coded-error.error';
import { ObjectValidationError } from '../../core/global/exceptions/object-validation.error';
import { DomainError } from '../../core/onion-layers/domain/exceptions/domain.error';
import { UseCaseError } from '../../core/onion-layers/app/exceptions/use-case.error';
import { NotFoundError } from '../../core/onion-layers/app/exceptions/not-found.error';
import { ConflictError } from '../../core/onion-layers/app/exceptions/conflict.error';
import { UnprocessableError } from '../../core/onion-layers/app/exceptions/unprocessable.error';
import { InfraError } from '../../core/onion-layers/infra/exceptions/infra.error';
import { ControllerError } from '../../core/onion-layers/presentation/exceptions/controller.error';
import { AccessDeniedError } from '../../core/onion-layers/presentation/exceptions/access-denied.error';
import { InvalidRequestError } from '../../core/onion-layers/presentation/exceptions/invalid-request.error';

/**
 * Error item for field-level validation errors.
 */
interface ErrorItem {
  item: string;
  message: string;
}

/**
 * Standard error response body.
 */
interface ErrorResponseBody {
  message: string;
  errorCode: string;
  errorItems?: ErrorItem[];
}

/**
 * Creates a JSON Response for HTTPException.
 */
function createErrorResponse(status: number, body: ErrorResponseBody): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Maps our error hierarchy to Hono's HTTPException.
 *
 * Mapping strategy:
 * - `ObjectValidationError` → 400 Bad Request
 * - `InvalidRequestError` → 400 Bad Request
 * - `AccessDeniedError` → 403 Forbidden
 * - `NotFoundError` → 404 Not Found
 * - `ConflictError` → 409 Conflict
 * - `UnprocessableError` → 422 Unprocessable Entity
 * - `UseCaseError` (other) → 400 Bad Request
 * - `DomainError` → 500 Internal Server Error (masked)
 * - `InfraError` → 500 Internal Server Error (masked)
 * - `ControllerError` → 500 Internal Server Error (masked)
 * - Unknown → 500 Internal Server Error (masked)
 *
 * **Security Note:** Domain and infrastructure errors are masked to avoid
 * leaking internal implementation details.
 *
 * @param error - The error to map
 * @returns Hono HTTPException with appropriate status and response body
 */
export function mapErrorToHttpException(error: unknown): HTTPException {
  // Already an HTTPException - return as-is
  if (error instanceof HTTPException) {
    return error;
  }

  // Validation errors → 400 Bad Request
  if (error instanceof ObjectValidationError) {
    return new HTTPException(400, {
      res: createErrorResponse(400, {
        message: error.message,
        errorCode: error.code,
        errorItems: error.validationErrors.map((e) => ({
          item: e.field,
          message: e.message,
        })),
      }),
      cause: error,
    });
  }

  if (error instanceof InvalidRequestError) {
    return new HTTPException(400, {
      res: createErrorResponse(400, {
        message: error.message,
        errorCode: error.code,
        errorItems: error.validationErrors.map((e) => ({
          item: e.field,
          message: e.message,
        })),
      }),
      cause: error,
    });
  }

  // Access control → 403 Forbidden
  if (error instanceof AccessDeniedError) {
    return new HTTPException(403, {
      res: createErrorResponse(403, {
        message: error.message,
        errorCode: error.code,
      }),
      cause: error,
    });
  }

  // Use case errors → specific HTTP status codes
  if (error instanceof NotFoundError) {
    return new HTTPException(404, {
      res: createErrorResponse(404, {
        message: error.message,
        errorCode: error.code,
      }),
      cause: error,
    });
  }

  if (error instanceof ConflictError) {
    return new HTTPException(409, {
      res: createErrorResponse(409, {
        message: error.message,
        errorCode: error.code,
      }),
      cause: error,
    });
  }

  if (error instanceof UnprocessableError) {
    return new HTTPException(422, {
      res: createErrorResponse(422, {
        message: error.message,
        errorCode: error.code,
      }),
      cause: error,
    });
  }

  // Other use case errors → 400 Bad Request
  if (error instanceof UseCaseError) {
    return new HTTPException(400, {
      res: createErrorResponse(400, {
        message: error.message,
        errorCode: error.code,
      }),
      cause: error,
    });
  }

  // Domain errors → 500 Internal Server Error (masked)
  if (error instanceof DomainError) {
    return new HTTPException(500, {
      res: createErrorResponse(500, {
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      }),
      cause: error,
    });
  }

  // Infrastructure errors → 500 Internal Server Error (masked)
  if (error instanceof InfraError) {
    return new HTTPException(500, {
      res: createErrorResponse(500, {
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      }),
      cause: error,
    });
  }

  // Controller errors → 500 Internal Server Error (masked)
  if (error instanceof ControllerError) {
    return new HTTPException(500, {
      res: createErrorResponse(500, {
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      }),
      cause: error,
    });
  }

  // CodedError (catch-all for known errors) → 500 (masked)
  if (error instanceof CodedError) {
    return new HTTPException(500, {
      res: createErrorResponse(500, {
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      }),
      cause: error,
    });
  }

  // Unknown errors → 500 Internal Server Error (masked)
  return new HTTPException(500, {
    res: createErrorResponse(500, {
      message: 'An unexpected error occurred',
      errorCode: 'INTERNAL_ERROR',
    }),
    cause: error,
  });
}
