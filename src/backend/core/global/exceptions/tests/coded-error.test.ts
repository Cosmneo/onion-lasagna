import { describe, it, expect } from 'vitest';
import { CodedError } from '../coded-error.error';

// Concrete implementation for testing the abstract class
class TestCodedError extends CodedError {
  static override fromError(cause: unknown): TestCodedError {
    return new TestCodedError({
      message: cause instanceof Error ? cause.message : 'Unknown error',
      code: 'TEST_ERROR',
      cause,
    });
  }
}

// Another subclass to test inheritance
class AnotherTestError extends CodedError {
  constructor(message: string) {
    super({ message, code: 'ANOTHER_ERROR' });
  }
}

describe('CodedError', () => {
  describe('constructor', () => {
    it('should create error with message and code', () => {
      const error = new TestCodedError({
        message: 'Something went wrong',
        code: 'ERR_001',
      });

      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('ERR_001');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodedError);
    });

    it('should set name to constructor name', () => {
      const error = new TestCodedError({
        message: 'Test',
        code: 'TEST',
      });

      expect(error.name).toBe('TestCodedError');
    });

    it('should preserve cause when provided', () => {
      const originalError = new Error('Original cause');
      const error = new TestCodedError({
        message: 'Wrapped error',
        code: 'WRAPPED',
        cause: originalError,
      });

      expect(error.cause).toBe(originalError);
    });

    it('should not have cause property when not provided', () => {
      const error = new TestCodedError({
        message: 'No cause',
        code: 'NO_CAUSE',
      });

      expect('cause' in error).toBe(false);
    });

    it('should allow non-Error cause values', () => {
      const stringCause = 'string error';
      const objectCause = { reason: 'something failed' };

      const errorWithString = new TestCodedError({
        message: 'With string',
        code: 'STRING_CAUSE',
        cause: stringCause,
      });

      const errorWithObject = new TestCodedError({
        message: 'With object',
        code: 'OBJECT_CAUSE',
        cause: objectCause,
      });

      expect(errorWithString.cause).toBe(stringCause);
      expect(errorWithObject.cause).toBe(objectCause);
    });
  });

  describe('inheritance', () => {
    it('should work with multiple levels of inheritance', () => {
      const error = new AnotherTestError('Another error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(AnotherTestError);
      expect(error.name).toBe('AnotherTestError');
      expect(error.code).toBe('ANOTHER_ERROR');
    });
  });

  describe('fromError static method', () => {
    it('should throw when called on base class without override', () => {
      // Access via prototype to test abstract behavior
      expect(() => CodedError.fromError(new Error('test'))).toThrow(
        'CodedError.fromError() must be implemented by subclass',
      );
    });

    it('should create error from Error instance when overridden', () => {
      const cause = new Error('Original error message');
      const error = TestCodedError.fromError(cause);

      expect(error).toBeInstanceOf(TestCodedError);
      expect(error.message).toBe('Original error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.cause).toBe(cause);
    });

    it('should handle non-Error values when overridden', () => {
      const error = TestCodedError.fromError('string error');

      expect(error.message).toBe('Unknown error');
      expect(error.cause).toBe('string error');
    });
  });

  describe('error stack', () => {
    it('should have a stack trace', () => {
      const error = new TestCodedError({
        message: 'Stack test',
        code: 'STACK',
      });

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TestCodedError');
    });
  });
});
