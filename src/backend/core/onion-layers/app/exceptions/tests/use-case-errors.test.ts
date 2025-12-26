import { describe, it, expect } from 'vitest';
import { UseCaseError } from '../use-case.error';
import { ConflictError } from '../conflict.error';
import { NotFoundError } from '../not-found.error';
import { UnprocessableError } from '../unprocessable.error';
import { CodedError } from '../../../../global/exceptions/coded-error.error';

describe('UseCaseError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new UseCaseError({ message: 'Use case failed' });

      expect(error.message).toBe('Use case failed');
      expect(error.code).toBe('USE_CASE_ERROR');
      expect(error.name).toBe('UseCaseError');
    });

    it('should accept custom code', () => {
      const error = new UseCaseError({
        message: 'Custom error',
        code: 'CUSTOM_USE_CASE_CODE',
      });

      expect(error.code).toBe('CUSTOM_USE_CASE_CODE');
    });

    it('should preserve cause', () => {
      const cause = new Error('Original cause');
      const error = new UseCaseError({
        message: 'Wrapped error',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of CodedError', () => {
      const error = new UseCaseError({ message: 'Test' });

      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Original message');
      const error = UseCaseError.fromError(original);

      expect(error).toBeInstanceOf(UseCaseError);
      expect(error.message).toBe('Original message');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = UseCaseError.fromError('string error');

      expect(error.message).toBe('Use case error');
      expect(error.cause).toBe('string error');
    });
  });
});

describe('ConflictError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new ConflictError({ message: 'Email already exists' });

      expect(error.message).toBe('Email already exists');
      expect(error.code).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });

    it('should accept custom code', () => {
      const error = new ConflictError({
        message: 'Duplicate entry',
        code: 'DUPLICATE_EMAIL',
      });

      expect(error.code).toBe('DUPLICATE_EMAIL');
    });

    it('should preserve cause', () => {
      const cause = new Error('DB unique constraint');
      const error = new ConflictError({
        message: 'Conflict detected',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of UseCaseError', () => {
      const error = new ConflictError({ message: 'Test' });

      expect(error).toBeInstanceOf(UseCaseError);
      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Duplicate key');
      const error = ConflictError.fromError(original);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('Duplicate key');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = ConflictError.fromError(null);

      expect(error.message).toBe('Conflict error');
      expect(error.cause).toBeNull();
    });
  });
});

describe('NotFoundError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new NotFoundError({ message: 'User not found' });

      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });

    it('should accept custom code', () => {
      const error = new NotFoundError({
        message: 'Entity missing',
        code: 'USER_NOT_FOUND',
      });

      expect(error.code).toBe('USER_NOT_FOUND');
    });

    it('should preserve cause', () => {
      const cause = new Error('Query returned null');
      const error = new NotFoundError({
        message: 'Resource not found',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of UseCaseError', () => {
      const error = new NotFoundError({ message: 'Test' });

      expect(error).toBeInstanceOf(UseCaseError);
      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Entity lookup failed');
      const error = NotFoundError.fromError(original);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Entity lookup failed');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = NotFoundError.fromError(undefined);

      expect(error.message).toBe('Resource not found');
      expect(error.cause).toBeUndefined();
    });
  });
});

describe('UnprocessableError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new UnprocessableError({ message: 'Insufficient balance' });

      expect(error.message).toBe('Insufficient balance');
      expect(error.code).toBe('UNPROCESSABLE');
      expect(error.name).toBe('UnprocessableError');
    });

    it('should accept custom code', () => {
      const error = new UnprocessableError({
        message: 'Cannot process',
        code: 'INSUFFICIENT_FUNDS',
      });

      expect(error.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('should preserve cause', () => {
      const cause = new Error('Business rule violation');
      const error = new UnprocessableError({
        message: 'Operation not allowed',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of UseCaseError', () => {
      const error = new UnprocessableError({ message: 'Test' });

      expect(error).toBeInstanceOf(UseCaseError);
      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Rule check failed');
      const error = UnprocessableError.fromError(original);

      expect(error).toBeInstanceOf(UnprocessableError);
      expect(error.message).toBe('Rule check failed');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = UnprocessableError.fromError({ reason: 'invalid state' });

      expect(error.message).toBe('Unprocessable request');
      expect(error.cause).toEqual({ reason: 'invalid state' });
    });
  });
});

describe('error hierarchy', () => {
  it('should allow catching UseCaseError to catch all subtypes', () => {
    const errors: UseCaseError[] = [
      new UseCaseError({ message: 'Base use case' }),
      new ConflictError({ message: 'Conflict' }),
      new NotFoundError({ message: 'Not found' }),
      new UnprocessableError({ message: 'Unprocessable' }),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(UseCaseError);
    }
  });

  it('should distinguish between error types', () => {
    const conflict = new ConflictError({ message: 'Conflict' });
    const notFound = new NotFoundError({ message: 'Not found' });
    const unprocessable = new UnprocessableError({ message: 'Unprocessable' });

    expect(conflict).toBeInstanceOf(ConflictError);
    expect(conflict).not.toBeInstanceOf(NotFoundError);
    expect(conflict).not.toBeInstanceOf(UnprocessableError);

    expect(notFound).toBeInstanceOf(NotFoundError);
    expect(notFound).not.toBeInstanceOf(ConflictError);
    expect(notFound).not.toBeInstanceOf(UnprocessableError);

    expect(unprocessable).toBeInstanceOf(UnprocessableError);
    expect(unprocessable).not.toBeInstanceOf(ConflictError);
    expect(unprocessable).not.toBeInstanceOf(NotFoundError);
  });

  it('should map to appropriate HTTP status concepts', () => {
    // ConflictError -> 409
    // NotFoundError -> 404
    // UnprocessableError -> 422
    const conflict = new ConflictError({ message: 'test' });
    const notFound = new NotFoundError({ message: 'test' });
    const unprocessable = new UnprocessableError({ message: 'test' });

    expect(conflict.code).toBe('CONFLICT');
    expect(notFound.code).toBe('NOT_FOUND');
    expect(unprocessable.code).toBe('UNPROCESSABLE');
  });
});
