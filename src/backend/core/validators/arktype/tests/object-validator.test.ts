import { describe, it, expect } from 'vitest';
import { type } from 'arktype';
import { ArkTypeObjectValidator } from '../object-validator.arktype';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('ArkTypeObjectValidator', () => {
  const validator = new ArkTypeObjectValidator();

  describe('validateObject', () => {
    describe('successful validation', () => {
      it('should validate a simple string', () => {
        const schema = type('string');
        const result = validator.validateObject(schema, 'hello');

        expect(result).toBe('hello');
      });

      it('should validate a number', () => {
        const schema = type('number');
        const result = validator.validateObject(schema, 42);

        expect(result).toBe(42);
      });

      it('should validate a boolean', () => {
        const schema = type('boolean');
        const result = validator.validateObject(schema, true);

        expect(result).toBe(true);
      });

      it('should validate a simple object', () => {
        const schema = type({
          name: 'string',
          age: 'number',
        });
        const input = { name: 'John', age: 30 };

        const result = validator.validateObject(schema, input);

        expect(result).toEqual(input);
      });

      it('should validate an array', () => {
        const schema = type('string[]');
        const input = ['a', 'b', 'c'];

        const result = validator.validateObject(schema, input);

        expect(result).toEqual(input);
      });

      it('should validate nested objects', () => {
        const schema = type({
          user: {
            email: 'string.email',
            profile: {
              name: 'string',
            },
          },
        });
        const input = {
          user: {
            email: 'test@example.com',
            profile: { name: 'John' },
          },
        };

        const result = validator.validateObject(schema, input);

        expect(result).toEqual(input);
      });
    });

    describe('validation failures', () => {
      it('should throw ObjectValidationError for invalid string', () => {
        const schema = type('string');

        expect(() => validator.validateObject(schema, 123)).toThrow(ObjectValidationError);
      });

      it('should throw ObjectValidationError for invalid number', () => {
        const schema = type('number');

        expect(() => validator.validateObject(schema, 'not a number')).toThrow(
          ObjectValidationError,
        );
      });

      it('should throw ObjectValidationError for invalid email', () => {
        const schema = type('string.email');

        expect(() => validator.validateObject(schema, 'invalid-email')).toThrow(
          ObjectValidationError,
        );
      });

      it('should throw ObjectValidationError for missing required fields', () => {
        const schema = type({
          name: 'string',
          email: 'string',
        });

        expect(() => validator.validateObject(schema, { name: 'John' })).toThrow(
          ObjectValidationError,
        );
      });

      it('should include validation errors in thrown error', () => {
        const schema = type({
          name: 'string',
          email: 'string.email',
        });

        try {
          validator.validateObject(schema, { name: 123, email: 'invalid' });
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors.length).toBeGreaterThan(0);
        }
      });
    });

    describe('path formatting', () => {
      it('should format root-level errors as "root"', () => {
        const schema = type('string');

        try {
          validator.validateObject(schema, 123);
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('root');
        }
      });

      it('should format simple field paths', () => {
        const schema = type({
          email: 'string.email',
        });

        try {
          validator.validateObject(schema, { email: 'invalid' });
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('email');
        }
      });

      it('should format nested field paths with dots', () => {
        const schema = type({
          user: {
            email: 'string.email',
          },
        });

        try {
          validator.validateObject(schema, { user: { email: 'invalid' } });
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('user.email');
        }
      });

      it('should format array indices with brackets', () => {
        const schema = type('string[]');

        try {
          validator.validateObject(schema, ['valid', 123, 'also valid']);
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('[1]');
        }
      });
    });
  });

  describe('withSchema', () => {
    it('should create a bound validator', () => {
      const schema = type({
        name: 'string',
      });
      const boundValidator = validator.withSchema(schema);

      expect(boundValidator).toHaveProperty('validate');
      expect(typeof boundValidator.validate).toBe('function');
    });

    it('should validate successfully with bound validator', () => {
      const schema = type('string');
      const boundValidator = validator.withSchema(schema);

      const result = boundValidator.validate('hello');

      expect(result).toBe('hello');
    });

    it('should throw ObjectValidationError with bound validator', () => {
      const schema = type('string');
      const boundValidator = validator.withSchema(schema);

      expect(() => boundValidator.validate(123)).toThrow(ObjectValidationError);
    });

    it('should be reusable for multiple validations', () => {
      const schema = type('number>0');
      const boundValidator = validator.withSchema(schema);

      expect(boundValidator.validate(5)).toBe(5);
      expect(boundValidator.validate(10)).toBe(10);
      expect(() => boundValidator.validate(-1)).toThrow(ObjectValidationError);
    });
  });

  describe('error cause', () => {
    it('should include original ArkType error as cause', () => {
      const schema = type('string');

      try {
        validator.validateObject(schema, 123);
      } catch (error) {
        expect(error).toBeInstanceOf(ObjectValidationError);
        const validationError = error as ObjectValidationError;
        expect(validationError.cause).toBeDefined();
        expect(validationError.cause).toBeInstanceOf(type.errors);
      }
    });
  });
});
