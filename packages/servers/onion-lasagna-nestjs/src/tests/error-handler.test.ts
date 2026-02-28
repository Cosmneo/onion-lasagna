/**
 * @fileoverview Integration tests for NestJS error handler.
 *
 * Tests the complete error handling flow from error creation
 * to HTTP response generation in NestJS framework.
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
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
import { mapErrorToResponse } from '../error-handler';

describe('NestJS error-handler', () => {
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

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(400);
        expect(body.message).toBe('Validation failed');
        expect(body.errorCode).toBe('OBJECT_VALIDATION_ERROR');
        expect(body.errorItems).toHaveLength(2);
        expect(body.errorItems![0]).toEqual({ item: 'email', message: 'Invalid email format' });
      });

      it('maps InvalidRequestError to 400 with field errors', () => {
        const error = new InvalidRequestError({
          message: 'Request validation failed',
          validationErrors: [{ field: 'body.title', message: 'Title too short' }],
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(400);
        expect(body.errorItems).toHaveLength(1);
        expect(body.errorItems![0]!.item).toBe('body.title');
      });

      it('maps UseCaseError to 400', () => {
        const error = new UseCaseError({
          message: 'Operation failed',
          code: 'OPERATION_FAILED',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(400);
        expect(body.message).toBe('Operation failed');
        expect(body.errorCode).toBe('OPERATION_FAILED');
      });
    });

    describe('access control errors → 403', () => {
      it('maps AccessDeniedError to 403', () => {
        const error = new AccessDeniedError({
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(403);
        expect(body.message).toBe('Insufficient permissions');
        expect(body.errorCode).toBe('PERMISSION_DENIED');
      });
    });

    describe('not found errors → 404', () => {
      it('maps NotFoundError to 404', () => {
        const error = new NotFoundError({
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(404);
        expect(body.message).toBe('User not found');
        expect(body.errorCode).toBe('USER_NOT_FOUND');
      });
    });

    describe('conflict errors → 409', () => {
      it('maps ConflictError to 409', () => {
        const error = new ConflictError({
          message: 'Email already exists',
          code: 'DUPLICATE_EMAIL',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(409);
        expect(body.message).toBe('Email already exists');
        expect(body.errorCode).toBe('DUPLICATE_EMAIL');
      });
    });

    describe('unprocessable errors → 422', () => {
      it('maps UnprocessableError to 422', () => {
        const error = new UnprocessableError({
          message: 'Cannot process this request',
          code: 'UNPROCESSABLE',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(422);
        expect(body.message).toBe('Cannot process this request');
      });
    });

    describe('internal errors → 500 (masked)', () => {
      it('masks DomainError to 500', () => {
        const error = new DomainError({
          message: 'Sensitive domain logic details',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(500);
        expect(body.message).toBe('An unexpected error occurred');
        expect(body.errorCode).toBe('INTERNAL_ERROR');
        expect(body.message).not.toContain('Sensitive');
      });

      it('masks InvariantViolationError to 500', () => {
        const error = new InvariantViolationError({
          message: 'Internal business rule violated',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(500);
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks InfraError to 500', () => {
        const error = new InfraError({
          message: 'Database connection string exposed',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(500);
        expect(body.message).toBe('An unexpected error occurred');
        expect(body.message).not.toContain('Database');
      });

      it('masks DbError to 500', () => {
        const error = new DbError({
          message: 'SQL syntax error in query',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(500);
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks NetworkError to 500', () => {
        const error = new NetworkError({
          message: 'Connection to internal service failed',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(500);
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks TimeoutError to 500', () => {
        const error = new TimeoutError({
          message: 'Operation timed out after 30s',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(500);
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks ExternalServiceError to 500', () => {
        const error = new ExternalServiceError({
          message: 'Third party API returned error',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(500);
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks ControllerError to 500', () => {
        const error = new ControllerError({
          message: 'Internal controller error',
        });

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(500);
        expect(body.message).toBe('An unexpected error occurred');
      });

      it('masks unknown errors to 500', () => {
        const error = new Error('Some unknown error');

        const { status, body } = mapErrorToResponse(error);
        expect(status).toBe(500);
        expect(body.message).toBe('An unexpected error occurred');
        expect(body.errorCode).toBe('INTERNAL_ERROR');
      });

      it('masks non-Error objects to 500', () => {
        const { status, body } = mapErrorToResponse('string error');
        expect(status).toBe(500);
        expect(body.message).toBe('An unexpected error occurred');
      });
    });
  });

  describe('error code preservation', () => {
    it('preserves custom error codes', () => {
      const error = new NotFoundError({
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
      });

      const { body } = mapErrorToResponse(error);
      expect(body.errorCode).toBe('PRODUCT_NOT_FOUND');
    });

    it('uses default error code when not specified', () => {
      const error = new NotFoundError({ message: 'Not found' });
      const { body } = mapErrorToResponse(error);
      expect(body.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('security', () => {
    it('never exposes internal error messages', () => {
      const sensitiveErrors = [
        new DomainError({ message: 'User password hash: abc123' }),
        new InfraError({ message: 'AWS_SECRET_KEY=xxx' }),
        new DbError({ message: 'SELECT * FROM users WHERE password = "secret"' }),
        new NetworkError({ message: 'Failed to connect to internal-service.cluster.local' }),
        new ControllerError({ message: 'Stack trace: at Object.<anonymous>' }),
      ];

      for (const error of sensitiveErrors) {
        const { body } = mapErrorToResponse(error);
        expect(body.message).toBe('An unexpected error occurred');
        expect(JSON.stringify(body)).not.toContain('password');
        expect(JSON.stringify(body)).not.toContain('secret');
        expect(JSON.stringify(body)).not.toContain('AWS');
      }
    });

    it('does not leak stack traces', () => {
      const error = new InfraError({ message: 'Something broke at /app/src/service.ts:42' });
      const { body } = mapErrorToResponse(error);
      const bodyStr = JSON.stringify(body);
      expect(bodyStr).not.toContain('stack');
      expect(bodyStr).not.toContain('/app/src');
    });
  });

  describe('response format consistency', () => {
    it('always returns message and errorCode', () => {
      const errors = [
        new NotFoundError({ message: 'Not found' }),
        new ConflictError({ message: 'Conflict' }),
        new AccessDeniedError({ message: 'Denied' }),
        new UseCaseError({ message: 'Bad request', code: 'BAD' }),
        new DomainError({ message: 'Internal' }),
      ];

      for (const error of errors) {
        const { body } = mapErrorToResponse(error);
        expect(body).toHaveProperty('message');
        expect(body).toHaveProperty('errorCode');
        expect(typeof body.message).toBe('string');
        expect(typeof body.errorCode).toBe('string');
      }
    });

    it('only includes errorItems for validation errors', () => {
      const validationError = new ObjectValidationError({
        message: 'Validation failed',
        validationErrors: [{ field: 'email', message: 'Invalid' }],
      });
      const { body: validationBody } = mapErrorToResponse(validationError);
      expect(validationBody.errorItems).toBeDefined();

      const nonValidationErrors = [
        new NotFoundError({ message: 'Not found' }),
        new ConflictError({ message: 'Conflict' }),
        new DomainError({ message: 'Internal' }),
      ];

      for (const error of nonValidationErrors) {
        const { body } = mapErrorToResponse(error);
        expect(body.errorItems).toBeUndefined();
      }
    });
  });
});
