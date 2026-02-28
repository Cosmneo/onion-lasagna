/**
 * @fileoverview Integration tests for Elysia error handler.
 *
 * Tests the complete error handling flow from error creation
 * to HTTP response generation in Elysia framework.
 */

import { describe, it, expect } from 'vitest';
import { mapErrorToResponse, onionErrorHandler } from '../error-handler';
import { ObjectValidationError } from '@cosmneo/onion-lasagna/global';
import {
  DomainError,
  InvariantViolationError,
  UseCaseError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  InfraError,
  DbError,
  NetworkError,
  TimeoutError,
  ExternalServiceError,
  ControllerError,
  AccessDeniedError,
  InvalidRequestError,
} from '@cosmneo/onion-lasagna';

describe('Elysia error-handler', () => {
  describe('mapErrorToResponse', () => {
    describe('validation errors → 400', () => {
      it('maps ObjectValidationError to 400 with field errors', () => {
        const error = new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'name', message: 'Name is required' },
          ],
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errorCode).toBe('OBJECT_VALIDATION_ERROR');
        expect(response.body.errorItems).toHaveLength(2);
        expect(response.body.errorItems![0]).toEqual({
          item: 'email',
          message: 'Invalid email format',
        });
      });

      it('maps InvalidRequestError to 400 with field errors', () => {
        const error = new InvalidRequestError({
          message: 'Request validation failed',
          validationErrors: [{ field: 'body.title', message: 'Title too short' }],
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(400);
        expect(response.body.errorItems).toHaveLength(1);
        expect(response.body.errorItems![0].item).toBe('body.title');
      });

      it('maps UseCaseError to 400', () => {
        const error = new UseCaseError({
          message: 'Operation failed',
          code: 'OPERATION_FAILED',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Operation failed');
        expect(response.body.errorCode).toBe('OPERATION_FAILED');
      });
    });

    describe('access control errors → 403', () => {
      it('maps AccessDeniedError to 403', () => {
        const error = new AccessDeniedError({
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Insufficient permissions');
        expect(response.body.errorCode).toBe('PERMISSION_DENIED');
      });
    });

    describe('not found errors → 404', () => {
      it('maps NotFoundError to 404', () => {
        const error = new NotFoundError({
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
        expect(response.body.errorCode).toBe('USER_NOT_FOUND');
      });
    });

    describe('conflict errors → 409', () => {
      it('maps ConflictError to 409', () => {
        const error = new ConflictError({
          message: 'Email already exists',
          code: 'DUPLICATE_EMAIL',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(409);
        expect(response.body.message).toBe('Email already exists');
        expect(response.body.errorCode).toBe('DUPLICATE_EMAIL');
      });
    });

    describe('unprocessable errors → 422', () => {
      it('maps UnprocessableError to 422', () => {
        const error = new UnprocessableError({
          message: 'Cannot process this request',
          code: 'UNPROCESSABLE',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(422);
        expect(response.body.message).toBe('Cannot process this request');
      });
    });

    describe('internal errors → 500 (masked)', () => {
      it('masks DomainError to 500', () => {
        const error = new DomainError({
          message: 'Sensitive domain logic details',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred');
        expect(response.body.errorCode).toBe('INTERNAL_ERROR');
        expect(response.body.message).not.toContain('Sensitive');
      });

      it('masks InvariantViolationError to 500', () => {
        const error = new InvariantViolationError({
          message: 'Internal business rule violated',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred');
      });

      it('masks InfraError to 500', () => {
        const error = new InfraError({
          message: 'Database connection string exposed',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred');
        expect(response.body.message).not.toContain('Database');
      });

      it('masks DbError to 500', () => {
        const error = new DbError({
          message: 'SQL syntax error in query',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred');
      });

      it('masks NetworkError to 500', () => {
        const error = new NetworkError({
          message: 'Connection to internal service failed',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred');
      });

      it('masks TimeoutError to 500', () => {
        const error = new TimeoutError({
          message: 'Operation timed out after 30s',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred');
      });

      it('masks ExternalServiceError to 500', () => {
        const error = new ExternalServiceError({
          message: 'Third party API returned error',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred');
      });

      it('masks ControllerError to 500', () => {
        const error = new ControllerError({
          message: 'Internal controller error',
        });

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred');
      });

      it('masks unknown errors to 500', () => {
        const error = new Error('Some unknown error');

        const response = mapErrorToResponse(error);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred');
        expect(response.body.errorCode).toBe('INTERNAL_ERROR');
      });

      it('masks non-Error objects to 500', () => {
        const response = mapErrorToResponse('string error');
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An unexpected error occurred');
      });
    });
  });

  describe('onionErrorHandler', () => {
    it('returns a Response object', () => {
      const error = new NotFoundError({ message: 'Not found' });
      const response = onionErrorHandler({ error });
      expect(response).toBeInstanceOf(Response);
    });

    it('sets correct status code', () => {
      const error = new NotFoundError({ message: 'Not found' });
      const response = onionErrorHandler({ error });
      expect(response.status).toBe(404);
    });

    it('sets Content-Type header to application/json', () => {
      const error = new NotFoundError({ message: 'Not found' });
      const response = onionErrorHandler({ error });
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('returns proper JSON body', async () => {
      const error = new ConflictError({ message: 'Conflict occurred', code: 'CONFLICT' });
      const response = onionErrorHandler({ error });
      const body = await response.json();
      expect(body.message).toBe('Conflict occurred');
      expect(body.errorCode).toBe('CONFLICT');
    });

    it('handles validation errors with field details', async () => {
      const error = new ObjectValidationError({
        message: 'Validation failed',
        validationErrors: [{ field: 'email', message: 'Invalid' }],
      });
      const response = onionErrorHandler({ error });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errorItems).toHaveLength(1);
      expect(body.errorItems[0]).toEqual({ item: 'email', message: 'Invalid' });
    });

    it('masks internal errors', async () => {
      const error = new DbError({ message: 'postgres://user:password@localhost' });
      const response = onionErrorHandler({ error });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe('An unexpected error occurred');
      expect(body.errorCode).toBe('INTERNAL_ERROR');
    });

    it('handles AccessDeniedError correctly', () => {
      const error = new AccessDeniedError({ message: 'Token expired' });
      const response = onionErrorHandler({ error });
      expect(response.status).toBe(403);
    });

    it('handles UnprocessableError correctly', () => {
      const error = new UnprocessableError({ message: 'Cannot process' });
      const response = onionErrorHandler({ error });
      expect(response.status).toBe(422);
    });
  });

  describe('error code preservation', () => {
    it('preserves custom error codes', async () => {
      const error = new NotFoundError({
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
      });

      const response = onionErrorHandler({ error });
      const body = await response.json();
      expect(body.errorCode).toBe('PRODUCT_NOT_FOUND');
    });

    it('uses default error code when not specified', async () => {
      const error = new NotFoundError({ message: 'Not found' });
      const response = onionErrorHandler({ error });
      const body = await response.json();
      expect(body.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('security', () => {
    it('never exposes internal error messages', async () => {
      const sensitiveErrors = [
        new DomainError({ message: 'User password hash: abc123' }),
        new InfraError({ message: 'AWS_SECRET_KEY=xxx' }),
        new DbError({ message: 'SELECT * FROM users WHERE password = "secret"' }),
        new NetworkError({ message: 'Failed to connect to internal-service.cluster.local' }),
        new ControllerError({ message: 'Stack trace: at Object.<anonymous>' }),
      ];

      for (const error of sensitiveErrors) {
        const response = onionErrorHandler({ error });
        const body = await response.json();
        expect(body.message).toBe('An unexpected error occurred');
        expect(JSON.stringify(body)).not.toContain('password');
        expect(JSON.stringify(body)).not.toContain('secret');
        expect(JSON.stringify(body)).not.toContain('AWS');
      }
    });

    it('does not leak stack traces', async () => {
      const error = new Error('Something went wrong');
      error.stack = 'Error: Something went wrong\n    at /app/src/secret/path.ts:123:45';

      const response = onionErrorHandler({ error });
      const body = await response.json();
      expect(JSON.stringify(body)).not.toContain('stack');
      expect(JSON.stringify(body)).not.toContain('/app/src');
    });
  });

  describe('response format consistency', () => {
    it('always returns message and errorCode', async () => {
      const errors = [
        new NotFoundError({ message: 'Not found' }),
        new ConflictError({ message: 'Conflict' }),
        new UseCaseError({ message: 'Failed' }),
        new DomainError({ message: 'Domain error' }),
        new Error('Unknown'),
      ];

      for (const error of errors) {
        const response = onionErrorHandler({ error });
        const body = await response.json();
        expect(body).toHaveProperty('message');
        expect(body).toHaveProperty('errorCode');
        expect(typeof body.message).toBe('string');
        expect(typeof body.errorCode).toBe('string');
      }
    });

    it('only includes errorItems for validation errors', async () => {
      const validationError = new ObjectValidationError({
        message: 'Validation failed',
        validationErrors: [{ field: 'name', message: 'Required' }],
      });
      const nonValidationError = new NotFoundError({ message: 'Not found' });

      const validationResponse = onionErrorHandler({ error: validationError });
      const validationBody = await validationResponse.json();
      expect(validationBody).toHaveProperty('errorItems');

      const nonValidationResponse = onionErrorHandler({ error: nonValidationError });
      const nonValidationBody = await nonValidationResponse.json();
      expect(nonValidationBody).not.toHaveProperty('errorItems');
    });
  });
});
