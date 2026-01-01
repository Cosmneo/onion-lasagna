/**
 * @fileoverview Tests for error mapping utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  getHttpStatusCode,
  shouldMaskError,
  createErrorResponseBody,
  mapErrorToHttpResponse,
  mapErrorToHttpResponseByName,
  isErrorType,
  hasValidationErrors,
} from '../error-mapping';
import { ObjectValidationError } from '../../../../../global/exceptions/object-validation.error';
import { DomainError } from '../../../../domain/exceptions/domain.error';
import { UseCaseError } from '../../../../app/exceptions/use-case.error';
import { NotFoundError } from '../../../../app/exceptions/not-found.error';
import { ConflictError } from '../../../../app/exceptions/conflict.error';
import { UnprocessableError } from '../../../../app/exceptions/unprocessable.error';
import { InfraError } from '../../../../infra/exceptions/infra.error';
import { ControllerError } from '../../../exceptions/controller.error';
import { AccessDeniedError } from '../../../exceptions/access-denied.error';
import { InvalidRequestError } from '../../../exceptions/invalid-request.error';

describe('error-mapping', () => {
  describe('getHttpStatusCode', () => {
    it('returns 400 for ObjectValidationError', () => {
      const error = new ObjectValidationError({
        message: 'Validation failed',
        validationErrors: [{ field: 'name', message: 'Required' }],
      });
      expect(getHttpStatusCode(error)).toBe(400);
    });

    it('returns 400 for InvalidRequestError', () => {
      const error = new InvalidRequestError({
        message: 'Invalid request',
        validationErrors: [{ field: 'id', message: 'Invalid format' }],
      });
      expect(getHttpStatusCode(error)).toBe(400);
    });

    it('returns 400 for UseCaseError', () => {
      const error = new UseCaseError({ message: 'Use case failed' });
      expect(getHttpStatusCode(error)).toBe(400);
    });

    it('returns 403 for AccessDeniedError', () => {
      const error = new AccessDeniedError({ message: 'Access denied' });
      expect(getHttpStatusCode(error)).toBe(403);
    });

    it('returns 404 for NotFoundError', () => {
      const error = new NotFoundError({ message: 'Not found' });
      expect(getHttpStatusCode(error)).toBe(404);
    });

    it('returns 409 for ConflictError', () => {
      const error = new ConflictError({ message: 'Conflict' });
      expect(getHttpStatusCode(error)).toBe(409);
    });

    it('returns 422 for UnprocessableError', () => {
      const error = new UnprocessableError({ message: 'Unprocessable' });
      expect(getHttpStatusCode(error)).toBe(422);
    });

    it('returns 500 for DomainError', () => {
      const error = new DomainError({ message: 'Domain error' });
      expect(getHttpStatusCode(error)).toBe(500);
    });

    it('returns 500 for InfraError', () => {
      const error = new InfraError({ message: 'Infra error' });
      expect(getHttpStatusCode(error)).toBe(500);
    });

    it('returns 500 for ControllerError', () => {
      const error = new ControllerError({ message: 'Controller error' });
      expect(getHttpStatusCode(error)).toBe(500);
    });

    it('returns 500 for unknown errors', () => {
      expect(getHttpStatusCode(new Error('Unknown'))).toBe(500);
      expect(getHttpStatusCode('string error')).toBe(500);
      expect(getHttpStatusCode(null)).toBe(500);
      expect(getHttpStatusCode(undefined)).toBe(500);
    });
  });

  describe('shouldMaskError', () => {
    it('returns true for DomainError', () => {
      const error = new DomainError({ message: 'Domain error' });
      expect(shouldMaskError(error)).toBe(true);
    });

    it('returns true for InfraError', () => {
      const error = new InfraError({ message: 'Infra error' });
      expect(shouldMaskError(error)).toBe(true);
    });

    it('returns true for ControllerError', () => {
      const error = new ControllerError({ message: 'Controller error' });
      expect(shouldMaskError(error)).toBe(true);
    });

    it('returns false for UseCaseError', () => {
      const error = new UseCaseError({ message: 'Use case error' });
      expect(shouldMaskError(error)).toBe(false);
    });

    it('returns false for NotFoundError', () => {
      const error = new NotFoundError({ message: 'Not found' });
      expect(shouldMaskError(error)).toBe(false);
    });

    it('returns false for AccessDeniedError', () => {
      const error = new AccessDeniedError({ message: 'Denied' });
      expect(shouldMaskError(error)).toBe(false);
    });

    it('returns false for InvalidRequestError', () => {
      const error = new InvalidRequestError({
        message: 'Invalid',
        validationErrors: [],
      });
      expect(shouldMaskError(error)).toBe(false);
    });
  });

  describe('createErrorResponseBody', () => {
    it('returns masked body for DomainError', () => {
      const error = new DomainError({ message: 'Internal details' });
      const body = createErrorResponseBody(error);
      expect(body).toEqual({
        message: 'An unexpected error occurred',
        errorCode: 'INTERNAL_ERROR',
      });
    });

    it('returns masked body for InfraError', () => {
      const error = new InfraError({ message: 'Database details' });
      const body = createErrorResponseBody(error);
      expect(body.message).toBe('An unexpected error occurred');
      expect(body.errorCode).toBe('INTERNAL_ERROR');
    });

    it('includes validation errors for ObjectValidationError', () => {
      const error = new ObjectValidationError({
        message: 'Validation failed',
        validationErrors: [
          { field: 'email', message: 'Invalid email' },
          { field: 'name', message: 'Required' },
        ],
      });
      const body = createErrorResponseBody(error);
      expect(body.message).toBe('Validation failed');
      expect(body.errorItems).toEqual([
        { item: 'email', message: 'Invalid email' },
        { item: 'name', message: 'Required' },
      ]);
    });

    it('includes validation errors for InvalidRequestError', () => {
      const error = new InvalidRequestError({
        message: 'Request validation failed',
        validationErrors: [{ field: 'body.title', message: 'Too short' }],
      });
      const body = createErrorResponseBody(error);
      expect(body.errorItems).toHaveLength(1);
      expect(body.errorItems![0]).toEqual({
        item: 'body.title',
        message: 'Too short',
      });
    });

    it('exposes message and code for UseCaseError', () => {
      const error = new UseCaseError({
        message: 'Operation failed',
        code: 'OPERATION_FAILED',
      });
      const body = createErrorResponseBody(error);
      expect(body.message).toBe('Operation failed');
      expect(body.errorCode).toBe('OPERATION_FAILED');
    });

    it('returns masked body for unknown errors', () => {
      const body = createErrorResponseBody(new Error('Unknown'));
      expect(body.message).toBe('An unexpected error occurred');
      expect(body.errorCode).toBe('INTERNAL_ERROR');
    });
  });

  describe('mapErrorToHttpResponse', () => {
    it('maps NotFoundError to 404 with message', () => {
      const error = new NotFoundError({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      const response = mapErrorToHttpResponse(error);
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
      expect(response.body.errorCode).toBe('USER_NOT_FOUND');
    });

    it('maps ConflictError to 409', () => {
      const error = new ConflictError({
        message: 'Email already exists',
        code: 'DUPLICATE_EMAIL',
      });
      const response = mapErrorToHttpResponse(error);
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Email already exists');
    });

    it('maps AccessDeniedError to 403', () => {
      const error = new AccessDeniedError({
        message: 'Insufficient permissions',
      });
      const response = mapErrorToHttpResponse(error);
      expect(response.status).toBe(403);
    });

    it('masks internal errors', () => {
      const error = new DomainError({ message: 'Sensitive info' });
      const response = mapErrorToHttpResponse(error);
      expect(response.status).toBe(500);
      expect(response.body.message).not.toContain('Sensitive');
    });
  });

  describe('isErrorType', () => {
    it('returns true for matching error type', () => {
      const error = new NotFoundError({ message: 'Not found' });
      expect(isErrorType(error, 'NotFoundError')).toBe(true);
    });

    it('returns false for non-matching error type', () => {
      const error = new NotFoundError({ message: 'Not found' });
      expect(isErrorType(error, 'ConflictError')).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isErrorType(null, 'NotFoundError')).toBe(false);
      expect(isErrorType(undefined, 'NotFoundError')).toBe(false);
    });

    it('returns false for non-objects', () => {
      expect(isErrorType('string', 'Error')).toBe(false);
      expect(isErrorType(123, 'Error')).toBe(false);
    });

    it('handles mangled names with underscore prefix', () => {
      // Create a mock error with mangled name
      class _NotFoundError extends Error {
        code = 'NOT_FOUND';
      }
      const error = new _NotFoundError('Not found');
      expect(isErrorType(error, 'NotFoundError')).toBe(true);
    });
  });

  describe('hasValidationErrors', () => {
    it('returns true for errors with validationErrors array', () => {
      const error = new InvalidRequestError({
        message: 'Invalid',
        validationErrors: [{ field: 'name', message: 'Required' }],
      });
      expect(hasValidationErrors(error)).toBe(true);
    });

    it('returns false for errors without validationErrors', () => {
      const error = new NotFoundError({ message: 'Not found' });
      expect(hasValidationErrors(error)).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(hasValidationErrors(null)).toBe(false);
      expect(hasValidationErrors(undefined)).toBe(false);
    });
  });

  describe('mapErrorToHttpResponseByName', () => {
    it('maps ObjectValidationError to 400 with field errors', () => {
      const error = new ObjectValidationError({
        message: 'Validation failed',
        validationErrors: [{ field: 'email', message: 'Invalid' }],
      });
      const response = mapErrorToHttpResponseByName(error);
      expect(response.status).toBe(400);
      expect(response.body.errorItems).toHaveLength(1);
    });

    it('maps InvalidRequestError to 400 with field errors', () => {
      const error = new InvalidRequestError({
        message: 'Invalid request',
        validationErrors: [{ field: 'id', message: 'Required' }],
      });
      const response = mapErrorToHttpResponseByName(error);
      expect(response.status).toBe(400);
    });

    it('maps AccessDeniedError to 403', () => {
      const error = new AccessDeniedError({ message: 'Forbidden' });
      const response = mapErrorToHttpResponseByName(error);
      expect(response.status).toBe(403);
    });

    it('maps NotFoundError to 404', () => {
      const error = new NotFoundError({ message: 'Not found' });
      const response = mapErrorToHttpResponseByName(error);
      expect(response.status).toBe(404);
    });

    it('maps ConflictError to 409', () => {
      const error = new ConflictError({ message: 'Conflict' });
      const response = mapErrorToHttpResponseByName(error);
      expect(response.status).toBe(409);
    });

    it('maps UnprocessableError to 422', () => {
      const error = new UnprocessableError({ message: 'Unprocessable' });
      const response = mapErrorToHttpResponseByName(error);
      expect(response.status).toBe(422);
    });

    it('maps UseCaseError to 400', () => {
      const error = new UseCaseError({ message: 'Failed' });
      const response = mapErrorToHttpResponseByName(error);
      expect(response.status).toBe(400);
    });

    it('masks DomainError to 500', () => {
      const error = new DomainError({ message: 'Internal' });
      const response = mapErrorToHttpResponseByName(error);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An unexpected error occurred');
    });

    it('masks InfraError to 500', () => {
      const error = new InfraError({ message: 'DB error' });
      const response = mapErrorToHttpResponseByName(error);
      expect(response.status).toBe(500);
      expect(response.body.errorCode).toBe('INTERNAL_ERROR');
    });

    it('masks ControllerError to 500', () => {
      const error = new ControllerError({ message: 'Controller' });
      const response = mapErrorToHttpResponseByName(error);
      expect(response.status).toBe(500);
    });

    it('masks unknown errors to 500', () => {
      const response = mapErrorToHttpResponseByName(new Error('Unknown'));
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An unexpected error occurred');
    });
  });
});
