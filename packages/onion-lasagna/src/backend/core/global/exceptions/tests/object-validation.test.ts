import { describe, it, expect } from 'vitest';
import { ObjectValidationError } from '../object-validation.error';
import { CodedError } from '../coded-error.error';

describe('ObjectValidationError', () => {
  describe('constructor', () => {
    it('should create with message and validation errors', () => {
      const validationErrors = [{ field: 'email', message: 'Invalid email format' }];
      const error = new ObjectValidationError({
        message: 'Validation failed',
        validationErrors,
      });

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('OBJECT_VALIDATION_ERROR');
      expect(error.name).toBe('ObjectValidationError');
      expect(error.validationErrors).toEqual(validationErrors);
    });

    it('should accept custom code', () => {
      const error = new ObjectValidationError({
        message: 'Custom validation error',
        code: 'CUSTOM_VALIDATION',
        validationErrors: [],
      });

      expect(error.code).toBe('CUSTOM_VALIDATION');
    });

    it('should preserve cause', () => {
      const cause = new Error('Zod validation failed');
      const error = new ObjectValidationError({
        message: 'Validation error',
        cause,
        validationErrors: [],
      });

      expect(error.cause).toBe(cause);
    });

    it('should store empty validation errors array', () => {
      const error = new ObjectValidationError({
        message: 'No specific errors',
        validationErrors: [],
      });

      expect(error.validationErrors).toEqual([]);
    });

    it('should store multiple validation errors', () => {
      const validationErrors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Too short' },
        { field: 'age', message: 'Must be a number' },
      ];

      const error = new ObjectValidationError({
        message: 'Multiple validation errors',
        validationErrors,
      });

      expect(error.validationErrors).toHaveLength(3);
      expect(error.validationErrors).toEqual(validationErrors);
    });
  });

  describe('inheritance', () => {
    it('should be instance of CodedError', () => {
      const error = new ObjectValidationError({
        message: 'Test',
        validationErrors: [],
      });

      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance with empty validation errors', () => {
      const original = new Error('Parse failed');
      const error = ObjectValidationError.fromError(original);

      expect(error).toBeInstanceOf(ObjectValidationError);
      expect(error.message).toBe('Parse failed');
      expect(error.cause).toBe(original);
      expect(error.validationErrors).toEqual([]);
    });

    it('should handle non-Error values', () => {
      const error = ObjectValidationError.fromError('string error');

      expect(error.message).toBe('Validation failed');
      expect(error.cause).toBe('string error');
      expect(error.validationErrors).toEqual([]);
    });

    it('should handle null', () => {
      const error = ObjectValidationError.fromError(null);

      expect(error.message).toBe('Validation failed');
      expect(error.cause).toBeNull();
    });

    it('should handle undefined', () => {
      const error = ObjectValidationError.fromError(undefined);

      expect(error.message).toBe('Validation failed');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('validation error formats', () => {
    describe('field formats', () => {
      it('should support simple field names', () => {
        const error = new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [
            { field: 'email', message: 'Invalid' },
            { field: 'name', message: 'Required' },
          ],
        });

        expect(error.validationErrors[0]?.field).toBe('email');
        expect(error.validationErrors[1]?.field).toBe('name');
      });

      it('should support dot-notation nested fields', () => {
        const error = new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [
            { field: 'user.email', message: 'Invalid email' },
            { field: 'user.address.city', message: 'Required' },
          ],
        });

        expect(error.validationErrors[0]?.field).toBe('user.email');
        expect(error.validationErrors[1]?.field).toBe('user.address.city');
      });

      it('should support array index fields', () => {
        const error = new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [
            { field: 'items.0.name', message: 'Required' },
            { field: 'items.1.quantity', message: 'Must be positive' },
          ],
        });

        expect(error.validationErrors[0]?.field).toBe('items.0.name');
        expect(error.validationErrors[1]?.field).toBe('items.1.quantity');
      });

      it('should support root-level field', () => {
        const error = new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [{ field: '', message: 'Invalid root object' }],
        });

        expect(error.validationErrors[0]?.field).toBe('');
      });
    });

    describe('message formats', () => {
      it('should store descriptive error messages', () => {
        const error = new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [
            { field: 'email', message: 'Must be a valid email address' },
            { field: 'password', message: 'Must be at least 8 characters' },
          ],
        });

        expect(error.validationErrors[0]?.message).toBe('Must be a valid email address');
        expect(error.validationErrors[1]?.message).toBe('Must be at least 8 characters');
      });
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical Zod validation errors', () => {
      // Simulating what a Zod validator might produce
      const validationErrors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'age', message: 'Expected number, received string' },
      ];

      const error = new ObjectValidationError({
        message: 'Request validation failed',
        validationErrors,
      });

      expect(error.validationErrors).toHaveLength(2);
    });

    it('should handle nested object validation', () => {
      const validationErrors = [
        { field: 'user.profile.bio', message: 'String must contain at most 500 character(s)' },
        { field: 'user.profile.website', message: 'Invalid url' },
      ];

      const error = new ObjectValidationError({
        message: 'Profile validation failed',
        validationErrors,
      });

      expect(error.validationErrors).toHaveLength(2);
    });

    it('should handle array validation', () => {
      const validationErrors = [
        { field: 'tags.0', message: 'String must contain at least 1 character(s)' },
        { field: 'tags.5', message: 'String must contain at least 1 character(s)' },
      ];

      const error = new ObjectValidationError({
        message: 'Tags validation failed',
        validationErrors,
      });

      expect(error.validationErrors).toHaveLength(2);
    });
  });
});
