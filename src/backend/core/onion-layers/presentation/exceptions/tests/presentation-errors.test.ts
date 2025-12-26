import { describe, it, expect } from 'vitest';
import { ControllerError } from '../controller.error';
import { AccessDeniedError } from '../access-denied.error';
import { InvalidRequestError } from '../invalid-request.error';
import { CodedError } from '../../../../global/exceptions/coded-error.error';

describe('ControllerError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new ControllerError({ message: 'Controller failed' });

      expect(error.message).toBe('Controller failed');
      expect(error.code).toBe('CONTROLLER_ERROR');
      expect(error.name).toBe('ControllerError');
    });

    it('should accept custom code', () => {
      const error = new ControllerError({
        message: 'Custom controller error',
        code: 'CUSTOM_CTRL_CODE',
      });

      expect(error.code).toBe('CUSTOM_CTRL_CODE');
    });

    it('should preserve cause', () => {
      const cause = new Error('Original cause');
      const error = new ControllerError({
        message: 'Wrapped error',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of CodedError', () => {
      const error = new ControllerError({ message: 'Test' });

      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Original message');
      const error = ControllerError.fromError(original);

      expect(error).toBeInstanceOf(ControllerError);
      expect(error.message).toBe('Original message');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = ControllerError.fromError('string error');

      expect(error.message).toBe('Controller error');
      expect(error.cause).toBe('string error');
    });
  });
});

describe('AccessDeniedError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new AccessDeniedError({ message: 'Access denied' });

      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('ACCESS_DENIED');
      expect(error.name).toBe('AccessDeniedError');
    });

    it('should accept custom code', () => {
      const error = new AccessDeniedError({
        message: 'Forbidden resource',
        code: 'RESOURCE_FORBIDDEN',
      });

      expect(error.code).toBe('RESOURCE_FORBIDDEN');
    });

    it('should preserve cause', () => {
      const cause = new Error('Auth failure');
      const error = new AccessDeniedError({
        message: 'Cannot access',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of CodedError', () => {
      const error = new AccessDeniedError({ message: 'Test' });

      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should NOT be instance of ControllerError', () => {
      // AccessDeniedError extends CodedError directly, not ControllerError
      const error = new AccessDeniedError({ message: 'Test' });

      expect(error).not.toBeInstanceOf(ControllerError);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Permission check failed');
      const error = AccessDeniedError.fromError(original);

      expect(error).toBeInstanceOf(AccessDeniedError);
      expect(error.message).toBe('Permission check failed');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = AccessDeniedError.fromError(null);

      expect(error.message).toBe('Access denied');
      expect(error.cause).toBeNull();
    });
  });
});

describe('InvalidRequestError', () => {
  describe('constructor', () => {
    it('should create with message, default code, and validation errors', () => {
      const validationErrors = [{ path: 'email', message: 'Invalid email' }];
      const error = new InvalidRequestError({
        message: 'Request validation failed',
        validationErrors,
      });

      expect(error.message).toBe('Request validation failed');
      expect(error.code).toBe('INVALID_REQUEST');
      expect(error.name).toBe('InvalidRequestError');
      expect(error.validationErrors).toEqual(validationErrors);
    });

    it('should accept custom code', () => {
      const error = new InvalidRequestError({
        message: 'Bad request',
        code: 'MALFORMED_REQUEST',
        validationErrors: [],
      });

      expect(error.code).toBe('MALFORMED_REQUEST');
    });

    it('should preserve cause', () => {
      const cause = new Error('Parsing error');
      const error = new InvalidRequestError({
        message: 'Cannot parse request',
        cause,
        validationErrors: [],
      });

      expect(error.cause).toBe(cause);
    });

    it('should store multiple validation errors', () => {
      const validationErrors = [
        { path: 'email', message: 'Invalid format' },
        { path: 'name', message: 'Required' },
        { path: 'age', message: 'Must be positive' },
      ];

      const error = new InvalidRequestError({
        message: 'Multiple errors',
        validationErrors,
      });

      expect(error.validationErrors).toHaveLength(3);
      expect(error.validationErrors).toEqual(validationErrors);
    });
  });

  describe('inheritance', () => {
    it('should be instance of CodedError', () => {
      const error = new InvalidRequestError({
        message: 'Test',
        validationErrors: [],
      });

      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should NOT be instance of ControllerError', () => {
      // InvalidRequestError extends CodedError directly, not ControllerError
      const error = new InvalidRequestError({
        message: 'Test',
        validationErrors: [],
      });

      expect(error).not.toBeInstanceOf(ControllerError);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance with empty validation errors', () => {
      const original = new Error('Parse failed');
      const error = InvalidRequestError.fromError(original);

      expect(error).toBeInstanceOf(InvalidRequestError);
      expect(error.message).toBe('Parse failed');
      expect(error.cause).toBe(original);
      expect(error.validationErrors).toEqual([]);
    });

    it('should handle non-Error values', () => {
      const error = InvalidRequestError.fromError({ reason: 'bad input' });

      expect(error.message).toBe('Invalid request');
      expect(error.cause).toEqual({ reason: 'bad input' });
      expect(error.validationErrors).toEqual([]);
    });
  });

  describe('validation errors format', () => {
    it('should support dot-notation paths', () => {
      const error = new InvalidRequestError({
        message: 'Nested validation failed',
        validationErrors: [
          { path: 'user.email', message: 'Invalid email' },
          { path: 'user.address.city', message: 'Required' },
        ],
      });

      expect(error.validationErrors[0]?.path).toBe('user.email');
      expect(error.validationErrors[1]?.path).toBe('user.address.city');
    });

    it('should support array index paths', () => {
      const error = new InvalidRequestError({
        message: 'Array validation failed',
        validationErrors: [
          { path: 'items.0.name', message: 'Required' },
          { path: 'items.1.quantity', message: 'Must be positive' },
        ],
      });

      expect(error.validationErrors[0]?.path).toBe('items.0.name');
      expect(error.validationErrors[1]?.path).toBe('items.1.quantity');
    });
  });
});

describe('presentation error hierarchy', () => {
  it('should allow catching CodedError to catch all presentation errors', () => {
    const errors: CodedError[] = [
      new ControllerError({ message: 'Controller' }),
      new AccessDeniedError({ message: 'Access' }),
      new InvalidRequestError({ message: 'Invalid', validationErrors: [] }),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(CodedError);
    }
  });

  it('should distinguish between error types', () => {
    const controller = new ControllerError({ message: 'Controller' });
    const access = new AccessDeniedError({ message: 'Access' });
    const invalid = new InvalidRequestError({ message: 'Invalid', validationErrors: [] });

    expect(controller).toBeInstanceOf(ControllerError);
    expect(controller).not.toBeInstanceOf(AccessDeniedError);
    expect(controller).not.toBeInstanceOf(InvalidRequestError);

    expect(access).toBeInstanceOf(AccessDeniedError);
    expect(access).not.toBeInstanceOf(ControllerError);
    expect(access).not.toBeInstanceOf(InvalidRequestError);

    expect(invalid).toBeInstanceOf(InvalidRequestError);
    expect(invalid).not.toBeInstanceOf(ControllerError);
    expect(invalid).not.toBeInstanceOf(AccessDeniedError);
  });

  it('should map to appropriate HTTP status concepts', () => {
    // ControllerError -> 500 (internal error)
    // AccessDeniedError -> 403 (forbidden)
    // InvalidRequestError -> 400 (bad request)
    const controller = new ControllerError({ message: 'test' });
    const access = new AccessDeniedError({ message: 'test' });
    const invalid = new InvalidRequestError({ message: 'test', validationErrors: [] });

    expect(controller.code).toBe('CONTROLLER_ERROR');
    expect(access.code).toBe('ACCESS_DENIED');
    expect(invalid.code).toBe('INVALID_REQUEST');
  });
});
