/**
 * @fileoverview Tests for error mapping utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  getHttpStatusCode,
  shouldMaskError,
  createErrorResponseBody,
  mapErrorToHttpResponse,
  isErrorType,
  hasValidationErrors,
} from '../error-mapping';
import { getErrorTypeName } from '../../../../global/exceptions/coded-error.error';
import { ObjectValidationError } from '../../../../global/exceptions/object-validation.error';
import { DomainError } from '../../../../domain/exceptions/domain.error';
import { PartialLoadError } from '../../../../domain/exceptions/partial-load.error';
import { UseCaseError } from '../../../../app/exceptions/use-case.error';
import { NotFoundError } from '../../../../app/exceptions/not-found.error';
import { ConflictError } from '../../../../app/exceptions/conflict.error';
import { UnprocessableError } from '../../../../app/exceptions/unprocessable.error';
import { InfraError } from '../../../../infra/exceptions/infra.error';
import { DbError } from '../../../../infra/exceptions/db.error';
import { TimeoutError } from '../../../../infra/exceptions/timeout.error';
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

    // C04-1 / C15-1 — InfraError subclasses must be masked
    it('returns true for DbError (InfraError subclass)', () => {
      const error = new DbError({ message: 'SELECT failed' });
      expect(shouldMaskError(error)).toBe(true);
    });

    it('returns true for TimeoutError (InfraError subclass)', () => {
      const error = new TimeoutError({ message: 'query timed out after 5 s' });
      expect(shouldMaskError(error)).toBe(true);
    });

    // C04-1 / C15-1 — DomainError subclasses must be masked
    it('returns true for PartialLoadError (DomainError subclass)', () => {
      const error = new PartialLoadError({ message: 'relation not loaded' });
      expect(shouldMaskError(error)).toBe(true);
    });

    // C04-1 cross-realm / mangled constructor.name simulation
    it('returns true for DbError with mangled constructor name (_DbError)', () => {
      // Simulate tsup bundle renaming: constructor.name becomes "_DbError"
      const error = new DbError({ message: 'raw driver text that must not leak' });
      Object.defineProperty(error.constructor, 'name', { value: '_DbError' });
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

    // C04-1 / C15-1 — DbError message must not leak
    it('masks DbError — raw DB driver text does not appear in response', () => {
      const error = new DbError({ message: 'FATAL: password authentication failed for user "app"' });
      const body = createErrorResponseBody(error);
      expect(body.message).toBe('An unexpected error occurred');
      expect(body.errorCode).toBe('INTERNAL_ERROR');
      expect(body.message).not.toContain('password');
    });

    it('masks TimeoutError — timeout details do not appear in response', () => {
      const error = new TimeoutError({ message: 'query timed out after 30 s on host db-primary' });
      const body = createErrorResponseBody(error);
      expect(body.message).toBe('An unexpected error occurred');
      expect(body.message).not.toContain('db-primary');
    });

    it('masks PartialLoadError — internal domain state does not appear in response', () => {
      const error = new PartialLoadError({ message: 'user.roles relation not loaded from repo' });
      const body = createErrorResponseBody(error);
      expect(body.message).toBe('An unexpected error occurred');
      expect(body.message).not.toContain('roles');
    });

    // C04-1 — cross-realm: mangled constructor.name must still be masked
    it('masks DbError with mangled constructor name (_DbError) — message does not leak', () => {
      const error = new DbError({ message: 'connection string: postgres://user:secret@host' });
      Object.defineProperty(error.constructor, 'name', { value: '_DbError' });
      const body = createErrorResponseBody(error);
      expect(body.message).toBe('An unexpected error occurred');
      expect(body.message).not.toContain('secret');
    });

    // C04 nit — mutable singleton: mutating one masked response body must not affect the next
    it('does not share state between masked response bodies (mutable singleton fix)', () => {
      const error1 = new DbError({ message: 'first db error' });
      const body1 = createErrorResponseBody(error1);
      // Mutate the returned body
      (body1 as Record<string, unknown>)['message'] = 'POISONED';

      const error2 = new TimeoutError({ message: 'second timeout' });
      const body2 = createErrorResponseBody(error2);
      expect(body2.message).toBe('An unexpected error occurred');
      expect(body2.message).not.toBe('POISONED');
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

    // C13-3 — stable brand tests: constructor.name completely reassigned to mangled value
    it('C13-3: identifies DbError correctly even when constructor.name is mangled to _DbError (via brand)', () => {
      const err = new DbError({ message: 'raw db text' });
      // Simulate what a bundler/minifier does: rename the class
      Object.defineProperty(err.constructor, 'name', { value: '_DbError', configurable: true });
      // The brand check should still work even though constructor.name no longer matches
      expect(getErrorTypeName(err)).toBe('DbError');
      expect(isErrorType(err, 'DbError')).toBe(true);
    });

    it('C13-3: identifies DbError correctly when constructor lacks the right name (plain object simulation)', () => {
      const err = new DbError({ message: 'raw db text' });
      // Completely zero out the constructor name to simulate extreme mangling
      Object.defineProperty(err.constructor, 'name', { value: 'a', configurable: true });
      // Brand should still identify it
      expect(getErrorTypeName(err)).toBe('DbError');
      expect(isErrorType(err, 'DbError')).toBe(true);
    });
  });

  describe('shouldMaskError (C13-3 brand hardening)', () => {
    it('C13-3: masks DbError even when constructor.name is mangled to _DbError (via brand)', () => {
      const err = new DbError({ message: 'secret connection string' });
      Object.defineProperty(err.constructor, 'name', { value: '_DbError', configurable: true });
      expect(shouldMaskError(err)).toBe(true);
    });

    it('C13-3: masks DomainError even when constructor.name is mangled', () => {
      const err = new DomainError({ message: 'internal domain state' });
      Object.defineProperty(err.constructor, 'name', { value: '_DomainError', configurable: true });
      expect(shouldMaskError(err)).toBe(true);
    });

    it('C13-3: createErrorResponseBody masks DbError with mangled name — brand keeps message hidden', () => {
      const err = new DbError({ message: 'postgres://user:secret@host/db' });
      Object.defineProperty(err.constructor, 'name', { value: '_DbError', configurable: true });
      const body = createErrorResponseBody(err);
      expect(body.message).toBe('An unexpected error occurred');
      expect(body.message).not.toContain('secret');
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
});
