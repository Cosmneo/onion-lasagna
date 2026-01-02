/**
 * @fileoverview Integration tests for Hono error handler.
 *
 * Tests the complete error handling flow from error creation
 * to HTTP response generation in Hono framework.
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { mapErrorToHttpException, onionErrorHandler } from '../error-handler';
import { ObjectValidationError } from '../../../../../../global/exceptions/object-validation.error';
import { DomainError } from '../../../../../domain/exceptions/domain.error';
import { InvariantViolationError } from '../../../../../domain/exceptions/invariant-violation.error';
import { UseCaseError } from '../../../../../app/exceptions/use-case.error';
import { NotFoundError } from '../../../../../app/exceptions/not-found.error';
import { ConflictError } from '../../../../../app/exceptions/conflict.error';
import { UnprocessableError } from '../../../../../app/exceptions/unprocessable.error';
import { InfraError } from '../../../../../infra/exceptions/infra.error';
import { DbError } from '../../../../../infra/exceptions/db.error';
import { NetworkError } from '../../../../../infra/exceptions/network.error';
import { TimeoutError } from '../../../../../infra/exceptions/timeout.error';
import { ExternalServiceError } from '../../../../../infra/exceptions/external-service.error';
import { ControllerError } from '../../../../exceptions/controller.error';
import { AccessDeniedError } from '../../../../exceptions/access-denied.error';
import { InvalidRequestError } from '../../../../exceptions/invalid-request.error';

describe('Hono error-handler', () => {
  describe('mapErrorToHttpException', () => {
    describe('passthrough HTTPException', () => {
      it('returns HTTPException as-is', () => {
        const original = new HTTPException(418, { message: 'I am a teapot' });
        const result = mapErrorToHttpException(original);
        expect(result).toBe(original);
        expect(result.status).toBe(418);
      });
    });

    describe('validation errors → 400', () => {
      it('maps ObjectValidationError to 400 with field errors', async () => {
        const error = new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'name', message: 'Name is required' },
          ],
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(400);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('Validation failed');
        expect(body.errorCode).toBe('OBJECT_VALIDATION_ERROR');
        expect(body.errorItems).toHaveLength(2);
        expect(body.errorItems[0]).toEqual({ item: 'email', message: 'Invalid email format' });
      });

      it('maps InvalidRequestError to 400 with field errors', async () => {
        const error = new InvalidRequestError({
          message: 'Request validation failed',
          validationErrors: [{ field: 'body.title', message: 'Title too short' }],
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(400);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.errorItems).toHaveLength(1);
        expect(body.errorItems[0].item).toBe('body.title');
      });

      it('maps UseCaseError to 400', async () => {
        const error = new UseCaseError({
          message: 'Operation failed',
          code: 'OPERATION_FAILED',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(400);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('Operation failed');
        expect(body.errorCode).toBe('OPERATION_FAILED');
      });
    });

    describe('access control errors → 403', () => {
      it('maps AccessDeniedError to 403', async () => {
        const error = new AccessDeniedError({
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(403);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('Insufficient permissions');
        expect(body.errorCode).toBe('PERMISSION_DENIED');
      });
    });

    describe('not found errors → 404', () => {
      it('maps NotFoundError to 404', async () => {
        const error = new NotFoundError({
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(404);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('User not found');
        expect(body.errorCode).toBe('USER_NOT_FOUND');
      });
    });

    describe('conflict errors → 409', () => {
      it('maps ConflictError to 409', async () => {
        const error = new ConflictError({
          message: 'Email already exists',
          code: 'DUPLICATE_EMAIL',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(409);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('Email already exists');
        expect(body.errorCode).toBe('DUPLICATE_EMAIL');
      });
    });

    describe('unprocessable errors → 422', () => {
      it('maps UnprocessableError to 422', async () => {
        const error = new UnprocessableError({
          message: 'Cannot process this request',
          code: 'UNPROCESSABLE',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(422);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('Cannot process this request');
      });
    });

    describe('internal errors → 500 (masked)', () => {
      it('masks DomainError to 500', async () => {
        const error = new DomainError({
          message: 'Sensitive domain logic details',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(500);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
        expect(body.errorCode).toBe('INTERNAL_ERROR');
        expect(body.message).not.toContain('Sensitive');
      });

      it('masks InvariantViolationError to 500', async () => {
        const error = new InvariantViolationError({
          message: 'Internal business rule violated',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(500);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks InfraError to 500', async () => {
        const error = new InfraError({
          message: 'Database connection string exposed',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(500);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
        expect(body.message).not.toContain('Database');
      });

      it('masks DbError to 500', async () => {
        const error = new DbError({
          message: 'SQL syntax error in query',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(500);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks NetworkError to 500', async () => {
        const error = new NetworkError({
          message: 'Connection to internal service failed',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(500);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks TimeoutError to 500', async () => {
        const error = new TimeoutError({
          message: 'Operation timed out after 30s',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(500);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks ExternalServiceError to 500', async () => {
        const error = new ExternalServiceError({
          message: 'Third party API returned error',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(500);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks ControllerError to 500', async () => {
        const error = new ControllerError({
          message: 'Internal controller error',
        });

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(500);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks unknown errors to 500', async () => {
        const error = new Error('Some unknown error');

        const exception = mapErrorToHttpException(error);
        expect(exception.status).toBe(500);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
        expect(body.errorCode).toBe('INTERNAL_ERROR');
      });

      it('masks non-Error objects to 500', async () => {
        const exception = mapErrorToHttpException('string error');
        expect(exception.status).toBe(500);

        const response = exception.getResponse();
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
      });
    });

    describe('error cause preservation', () => {
      it('preserves original error as cause in HTTPException', () => {
        const originalError = new NotFoundError({ message: 'Resource not found' });
        const exception = mapErrorToHttpException(originalError);
        expect(exception.cause).toBe(originalError);
      });
    });
  });

  describe('onionErrorHandler', () => {
    it('returns a Response object', () => {
      const error = new NotFoundError({ message: 'Not found' });
      const response = onionErrorHandler(error, {} as never);
      expect(response).toBeInstanceOf(Response);
    });

    it('sets correct status code', async () => {
      const error = new NotFoundError({ message: 'Not found' });
      const response = onionErrorHandler(error, {} as never);
      expect(response.status).toBe(404);
    });

    it('sets Content-Type header', async () => {
      const error = new NotFoundError({ message: 'Not found' });
      const response = onionErrorHandler(error, {} as never);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('returns proper JSON body', async () => {
      const error = new ConflictError({ message: 'Conflict occurred' });
      const response = onionErrorHandler(error, {} as never);
      const body = await response.json();
      expect(body.message).toBe('Conflict occurred');
    });
  });

  describe('Hono app integration', () => {
    it('handles errors thrown in routes', async () => {
      const app = new Hono();
      app.onError(onionErrorHandler);

      app.get('/users/:id', () => {
        throw new NotFoundError({ message: 'User not found', code: 'USER_NOT_FOUND' });
      });

      const res = await app.request('/users/123');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.message).toBe('User not found');
      expect(body.errorCode).toBe('USER_NOT_FOUND');
    });

    it('handles async errors in routes', async () => {
      const app = new Hono();
      app.onError(onionErrorHandler);

      app.post('/projects', async () => {
        await Promise.resolve();
        throw new ConflictError({ message: 'Project already exists' });
      });

      const res = await app.request('/projects', { method: 'POST' });
      expect(res.status).toBe(409);
    });

    it('handles validation errors with field details', async () => {
      const app = new Hono();
      app.onError(onionErrorHandler);

      app.post('/users', () => {
        throw new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [
            { field: 'email', message: 'Invalid email' },
            { field: 'password', message: 'Too short' },
          ],
        });
      });

      const res = await app.request('/users', { method: 'POST' });
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.errorItems).toHaveLength(2);
    });

    it('masks internal errors in routes', async () => {
      const app = new Hono();
      app.onError(onionErrorHandler);

      app.get('/data', () => {
        throw new DbError({ message: 'Connection string: postgres://secret@db' });
      });

      const res = await app.request('/data');
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.message).toBe('An unexpected error occurred');
      expect(body.message).not.toContain('postgres');
      expect(body.message).not.toContain('secret');
    });

    it('handles middleware errors', async () => {
      const app = new Hono();
      app.onError(onionErrorHandler);

      app.use('*', async (_c, next) => {
        throw new AccessDeniedError({ message: 'Token expired' });
        await next();
      });

      app.get('/protected', (c) => c.json({ data: 'secret' }));

      const res = await app.request('/protected');
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.message).toBe('Token expired');
    });

    it('handles nested route errors', async () => {
      const app = new Hono();
      const api = new Hono();

      app.onError(onionErrorHandler);
      api.get('/items/:id', () => {
        throw new NotFoundError({ message: 'Item not found' });
      });

      app.route('/api', api);

      const res = await app.request('/api/items/999');
      expect(res.status).toBe(404);
    });
  });
});
