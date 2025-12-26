import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { onionErrorHandler } from '../error-handler';
import { mapErrorToHttpException } from '../map-error-to-http-exception';
import { NotFoundError } from '../../../core/onion-layers/app/exceptions/not-found.error';
import { ConflictError } from '../../../core/onion-layers/app/exceptions/conflict.error';
import { UnprocessableError } from '../../../core/onion-layers/app/exceptions/unprocessable.error';
import { UseCaseError } from '../../../core/onion-layers/app/exceptions/use-case.error';
import { AccessDeniedError } from '../../../core/onion-layers/presentation/exceptions/access-denied.error';
import { InvalidRequestError } from '../../../core/onion-layers/presentation/exceptions/invalid-request.error';
import { DomainError } from '../../../core/onion-layers/domain/exceptions/domain.error';
import { InfraError } from '../../../core/onion-layers/infra/exceptions/infra.error';
import { ControllerError } from '../../../core/onion-layers/presentation/exceptions/controller.error';
import { ObjectValidationError } from '../../../core/global/exceptions/object-validation.error';

describe('mapErrorToHttpException', () => {
  describe('HTTPException passthrough', () => {
    it('should return HTTPException as-is', () => {
      const original = new HTTPException(418, { message: "I'm a teapot" });
      const result = mapErrorToHttpException(original);
      expect(result).toBe(original);
    });
  });

  describe('ObjectValidationError → 400', () => {
    it('should map ObjectValidationError to 400 with error items', async () => {
      const error = new ObjectValidationError({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        validationErrors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'age', message: 'Must be positive' },
        ],
      });

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(400);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        errorItems: [
          { item: 'email', message: 'Invalid email format' },
          { item: 'age', message: 'Must be positive' },
        ],
      });
    });
  });

  describe('InvalidRequestError → 400', () => {
    it('should map InvalidRequestError to 400 with error items', async () => {
      const error = new InvalidRequestError({
        message: 'Invalid request',
        code: 'INVALID_REQUEST',
        validationErrors: [{ field: 'id', message: 'Required' }],
      });

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(400);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'Invalid request',
        errorCode: 'INVALID_REQUEST',
        errorItems: [{ item: 'id', message: 'Required' }],
      });
    });
  });

  describe('AccessDeniedError → 403', () => {
    it('should map AccessDeniedError to 403', async () => {
      const error = new AccessDeniedError({
        message: 'Access denied',
        code: 'ACCESS_DENIED',
      });

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(403);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'Access denied',
        errorCode: 'ACCESS_DENIED',
      });
    });
  });

  describe('NotFoundError → 404', () => {
    it('should map NotFoundError to 404', async () => {
      const error = new NotFoundError({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(404);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    });
  });

  describe('ConflictError → 409', () => {
    it('should map ConflictError to 409', async () => {
      const error = new ConflictError({
        message: 'Email already exists',
        code: 'EMAIL_CONFLICT',
      });

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(409);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'Email already exists',
        errorCode: 'EMAIL_CONFLICT',
      });
    });
  });

  describe('UnprocessableError → 422', () => {
    it('should map UnprocessableError to 422', async () => {
      const error = new UnprocessableError({
        message: 'Cannot process request',
        code: 'UNPROCESSABLE',
      });

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(422);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'Cannot process request',
        errorCode: 'UNPROCESSABLE',
      });
    });
  });

  describe('UseCaseError → 400', () => {
    it('should map generic UseCaseError to 400', async () => {
      const error = new UseCaseError({
        message: 'Business rule violation',
        code: 'BUSINESS_ERROR',
      });

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(400);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'Business rule violation',
        errorCode: 'BUSINESS_ERROR',
      });
    });
  });

  describe('Internal errors → 500 (masked)', () => {
    it('should mask DomainError as 500 Internal Error', async () => {
      const error = new DomainError({
        message: 'Sensitive domain error',
        code: 'DOMAIN_ERROR',
      });

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(500);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      });
    });

    it('should mask InfraError as 500 Internal Error', async () => {
      const error = new InfraError({
        message: 'Database connection failed',
        code: 'DB_ERROR',
      });

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(500);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      });
    });

    it('should mask ControllerError as 500 Internal Error', async () => {
      const error = new ControllerError({
        message: 'Controller internal error',
        code: 'CONTROLLER_ERROR',
      });

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(500);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      });
    });

    it('should mask unknown errors as 500 Internal Error', async () => {
      const error = new Error('Something unexpected');

      const result = mapErrorToHttpException(error);
      expect(result.status).toBe(500);

      const response = result.getResponse();
      const body = await response.json();
      expect(body).toEqual({
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      });
    });
  });
});

describe('onionErrorHandler integration', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(onionErrorHandler);
  });

  it('should handle NotFoundError thrown from route', async () => {
    app.get('/users/:id', () => {
      throw new NotFoundError({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    });

    const res = await app.request('/users/123');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toEqual({
      message: 'User not found',
      errorCode: 'USER_NOT_FOUND',
    });
  });

  it('should handle AccessDeniedError thrown from route', async () => {
    app.get('/admin', () => {
      throw new AccessDeniedError({
        message: 'Admin access required',
        code: 'ADMIN_REQUIRED',
      });
    });

    const res = await app.request('/admin');
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body).toEqual({
      message: 'Admin access required',
      errorCode: 'ADMIN_REQUIRED',
    });
  });

  it('should handle ConflictError thrown from route', async () => {
    app.post('/users', () => {
      throw new ConflictError({
        message: 'Email already registered',
        code: 'EMAIL_EXISTS',
      });
    });

    const res = await app.request('/users', { method: 'POST' });
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body).toEqual({
      message: 'Email already registered',
      errorCode: 'EMAIL_EXISTS',
    });
  });

  it('should mask internal errors from route', async () => {
    app.get('/crash', () => {
      throw new Error('Unexpected internal error');
    });

    const res = await app.request('/crash');
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body).toEqual({
      message: 'An unexpected error occurred',
      errorCode: 'INTERNAL_ERROR',
    });
  });
});
