import { describe, it, expect } from 'vitest';
import { DomainError } from '../domain.error';
import { InvariantViolationError } from '../invariant-violation.error';
import { PartialLoadError } from '../partial-load.error';
import { CodedError } from '../../../../global/exceptions/coded-error.error';

describe('DomainError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new DomainError({ message: 'Domain rule violated' });

      expect(error.message).toBe('Domain rule violated');
      expect(error.code).toBe('DOMAIN_ERROR');
      expect(error.name).toBe('DomainError');
    });

    it('should accept custom code', () => {
      const error = new DomainError({
        message: 'Custom domain error',
        code: 'CUSTOM_DOMAIN_CODE',
      });

      expect(error.code).toBe('CUSTOM_DOMAIN_CODE');
    });

    it('should preserve cause', () => {
      const cause = new Error('Original cause');
      const error = new DomainError({
        message: 'Wrapped domain error',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of CodedError', () => {
      const error = new DomainError({ message: 'Test' });

      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Original error message');
      const error = DomainError.fromError(original);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.message).toBe('Original error message');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = DomainError.fromError('string error');

      expect(error.message).toBe('Domain error');
      expect(error.cause).toBe('string error');
    });
  });
});

describe('InvariantViolationError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new InvariantViolationError({ message: 'Invariant violated' });

      expect(error.message).toBe('Invariant violated');
      expect(error.code).toBe('INVARIANT_VIOLATION');
      expect(error.name).toBe('InvariantViolationError');
    });

    it('should accept custom code', () => {
      const error = new InvariantViolationError({
        message: 'Custom invariant violation',
        code: 'CUSTOM_INVARIANT',
      });

      expect(error.code).toBe('CUSTOM_INVARIANT');
    });

    it('should preserve cause', () => {
      const cause = new TypeError('Type mismatch');
      const error = new InvariantViolationError({
        message: 'Type invariant failed',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of DomainError', () => {
      const error = new InvariantViolationError({ message: 'Test' });

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Original invariant message');
      const error = InvariantViolationError.fromError(original);

      expect(error).toBeInstanceOf(InvariantViolationError);
      expect(error.message).toBe('Original invariant message');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = InvariantViolationError.fromError(undefined);

      expect(error.message).toBe('Invariant violation');
      expect(error.cause).toBeUndefined();
    });
  });
});

describe('PartialLoadError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new PartialLoadError({ message: 'Relation not loaded' });

      expect(error.message).toBe('Relation not loaded');
      expect(error.code).toBe('PARTIAL_LOAD');
      expect(error.name).toBe('PartialLoadError');
    });

    it('should accept custom code', () => {
      const error = new PartialLoadError({
        message: 'Customer not loaded',
        code: 'CUSTOMER_NOT_LOADED',
      });

      expect(error.code).toBe('CUSTOMER_NOT_LOADED');
    });

    it('should preserve cause', () => {
      const cause = new Error('Database query failed');
      const error = new PartialLoadError({
        message: 'Failed to load aggregate',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of DomainError', () => {
      const error = new PartialLoadError({ message: 'Test' });

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Original partial load message');
      const error = PartialLoadError.fromError(original);

      expect(error).toBeInstanceOf(PartialLoadError);
      expect(error.message).toBe('Original partial load message');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = PartialLoadError.fromError({ reason: 'missing data' });

      expect(error.message).toBe('Partial load error');
      expect(error.cause).toEqual({ reason: 'missing data' });
    });
  });
});

describe('error hierarchy', () => {
  it('should allow catching DomainError to catch all subtypes', () => {
    const errors: DomainError[] = [
      new DomainError({ message: 'Base domain' }),
      new InvariantViolationError({ message: 'Invariant' }),
      new PartialLoadError({ message: 'Partial' }),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(DomainError);
    }
  });

  it('should distinguish between error types', () => {
    const invariant = new InvariantViolationError({ message: 'Invariant' });
    const partial = new PartialLoadError({ message: 'Partial' });

    expect(invariant).toBeInstanceOf(InvariantViolationError);
    expect(invariant).not.toBeInstanceOf(PartialLoadError);

    expect(partial).toBeInstanceOf(PartialLoadError);
    expect(partial).not.toBeInstanceOf(InvariantViolationError);
  });
});
