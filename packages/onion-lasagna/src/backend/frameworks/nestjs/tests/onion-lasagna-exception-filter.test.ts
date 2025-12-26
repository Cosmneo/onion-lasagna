import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnionLasagnaExceptionFilter } from '../filters/onion-lasagna-exception.filter';
import type { ArgumentsHost } from '@nestjs/common';
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

describe('OnionLasagnaExceptionFilter', () => {
  let filter: OnionLasagnaExceptionFilter;
  let mockResponse: {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new OnionLasagnaExceptionFilter();

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
    } as unknown as ArgumentsHost;
  });

  describe('ObjectValidationError → 400', () => {
    it('should return 400 with error items', () => {
      const error = new ObjectValidationError({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        validationErrors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'age', message: 'Must be positive' },
        ],
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
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
    it('should return 400 with error items', () => {
      const error = new InvalidRequestError({
        message: 'Invalid request',
        code: 'INVALID_REQUEST',
        validationErrors: [{ field: 'id', message: 'Required' }],
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Invalid request',
        errorCode: 'INVALID_REQUEST',
        errorItems: [{ item: 'id', message: 'Required' }],
      });
    });
  });

  describe('AccessDeniedError → 403', () => {
    it('should return 403', () => {
      const error = new AccessDeniedError({
        message: 'Access denied',
        code: 'ACCESS_DENIED',
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Access denied',
        errorCode: 'ACCESS_DENIED',
      });
    });
  });

  describe('NotFoundError → 404', () => {
    it('should return 404', () => {
      const error = new NotFoundError({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    });
  });

  describe('ConflictError → 409', () => {
    it('should return 409', () => {
      const error = new ConflictError({
        message: 'Email already exists',
        code: 'EMAIL_CONFLICT',
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Email already exists',
        errorCode: 'EMAIL_CONFLICT',
      });
    });
  });

  describe('UnprocessableError → 422', () => {
    it('should return 422', () => {
      const error = new UnprocessableError({
        message: 'Cannot process request',
        code: 'UNPROCESSABLE',
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Cannot process request',
        errorCode: 'UNPROCESSABLE',
      });
    });
  });

  describe('UseCaseError → 400', () => {
    it('should return 400 for generic use case errors', () => {
      const error = new UseCaseError({
        message: 'Business rule violation',
        code: 'BUSINESS_ERROR',
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Business rule violation',
        errorCode: 'BUSINESS_ERROR',
      });
    });
  });

  describe('Internal errors → 500 (masked)', () => {
    it('should mask DomainError as 500', () => {
      const error = new DomainError({
        message: 'Sensitive domain error',
        code: 'DOMAIN_ERROR',
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      });
    });

    it('should mask InfraError as 500', () => {
      const error = new InfraError({
        message: 'Database connection failed',
        code: 'DB_ERROR',
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      });
    });

    it('should mask ControllerError as 500', () => {
      const error = new ControllerError({
        message: 'Controller internal error',
        code: 'CONTROLLER_ERROR',
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      });
    });

    it('should mask unknown errors as 500', () => {
      const error = new Error('Something unexpected');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      });
    });
  });
});
