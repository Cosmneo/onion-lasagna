/**
 * @fileoverview Tests for Express error handler.
 *
 * Tests the complete error handling flow from error creation
 * to HTTP response generation in Express framework.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
import type { Request, Response, NextFunction } from 'express';

/**
 * Creates a mock Express response object for testing.
 */
function createMockResponse(): Response {
  const res = {
    statusCode: 200,
    sentBody: null as unknown,
    status: vi.fn(function (this: typeof res, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: typeof res, body: unknown) {
      this.sentBody = body;
      return this;
    }),
  };
  return res as unknown as Response;
}

/**
 * Creates a mock Express request object for testing.
 */
function createMockRequest(): Request {
  return {
    url: '/test',
    method: 'GET',
  } as Request;
}

describe('Express error-handler', () => {
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
    let mockRes: Response;
    let mockReq: Request;
    const mockNext: NextFunction = vi.fn();

    beforeEach(() => {
      mockRes = createMockResponse();
      mockReq = createMockRequest();
    });

    it('sets correct status code on response', () => {
      const error = new NotFoundError({ message: 'Not found' });
      onionErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('sends correct body on response', () => {
      const error = new ConflictError({ message: 'Conflict occurred', code: 'CONFLICT' });
      onionErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Conflict occurred',
        errorCode: 'CONFLICT',
      });
    });

    it('handles validation errors with field details', () => {
      const error = new ObjectValidationError({
        message: 'Validation failed',
        validationErrors: [{ field: 'email', message: 'Invalid' }],
      });
      onionErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed',
          errorItems: [{ item: 'email', message: 'Invalid' }],
        }),
      );
    });

    it('masks internal errors', () => {
      const error = new DbError({ message: 'postgres://user:password@localhost' });
      onionErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      });
    });

    it('handles AccessDeniedError correctly', () => {
      const error = new AccessDeniedError({ message: 'Token expired' });
      onionErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('handles UnprocessableError correctly', () => {
      const error = new UnprocessableError({ message: 'Cannot process' });
      onionErrorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(422);
    });
  });

  describe('error code preservation', () => {
    it('preserves custom error codes', () => {
      const error = new NotFoundError({
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
      });

      const response = mapErrorToResponse(error);
      expect(response.body.errorCode).toBe('PRODUCT_NOT_FOUND');
    });

    it('uses default error code when not specified', () => {
      const error = new NotFoundError({ message: 'Not found' });
      const response = mapErrorToResponse(error);
      expect(response.body.errorCode).toBe('NOT_FOUND');
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
        const response = mapErrorToResponse(error);
        expect(response.body.message).toBe('An unexpected error occurred');
        expect(JSON.stringify(response.body)).not.toContain('password');
        expect(JSON.stringify(response.body)).not.toContain('secret');
        expect(JSON.stringify(response.body)).not.toContain('AWS');
      }
    });

    it('does not leak stack traces', () => {
      const error = new InfraError({ message: 'Something broke at /app/src/service.ts:42' });
      const response = mapErrorToResponse(error);
      const bodyStr = JSON.stringify(response.body);
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
        const response = mapErrorToResponse(error);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('errorCode');
        expect(typeof response.body.message).toBe('string');
        expect(typeof response.body.errorCode).toBe('string');
      }
    });

    it('only includes errorItems for validation errors', () => {
      const validationError = new ObjectValidationError({
        message: 'Validation failed',
        validationErrors: [{ field: 'email', message: 'Invalid' }],
      });
      const validationResponse = mapErrorToResponse(validationError);
      expect(validationResponse.body.errorItems).toBeDefined();

      const nonValidationErrors = [
        new NotFoundError({ message: 'Not found' }),
        new ConflictError({ message: 'Conflict' }),
        new DomainError({ message: 'Internal' }),
      ];

      for (const error of nonValidationErrors) {
        const response = mapErrorToResponse(error);
        expect(response.body.errorItems).toBeUndefined();
      }
    });
  });
});
