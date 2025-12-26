import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { TypeBoxObjectValidator } from '../object-validator.typebox';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('TypeBoxObjectValidator', () => {
  const validator = new TypeBoxObjectValidator();

  describe('validateObject', () => {
    describe('successful validation', () => {
      it('should validate a simple string', () => {
        const schema = Type.String();
        const result = validator.validateObject(schema, 'hello');

        expect(result).toBe('hello');
      });

      it('should validate a number', () => {
        const schema = Type.Number();
        const result = validator.validateObject(schema, 42);

        expect(result).toBe(42);
      });

      it('should validate a boolean', () => {
        const schema = Type.Boolean();
        const result = validator.validateObject(schema, true);

        expect(result).toBe(true);
      });

      it('should validate a simple object', () => {
        const schema = Type.Object({
          name: Type.String(),
          age: Type.Number(),
        });
        const input = { name: 'John', age: 30 };

        const result = validator.validateObject(schema, input);

        expect(result).toEqual(input);
      });

      it('should validate an array', () => {
        const schema = Type.Array(Type.String());
        const input = ['a', 'b', 'c'];

        const result = validator.validateObject(schema, input);

        expect(result).toEqual(input);
      });

      it('should validate nested objects', () => {
        const schema = Type.Object({
          user: Type.Object({
            name: Type.String(),
            profile: Type.Object({
              bio: Type.String(),
            }),
          }),
        });
        const input = {
          user: {
            name: 'John',
            profile: { bio: 'A developer' },
          },
        };

        const result = validator.validateObject(schema, input);

        expect(result).toEqual(input);
      });
    });

    describe('validation failures', () => {
      it('should throw ObjectValidationError for invalid string', () => {
        const schema = Type.String();

        expect(() => validator.validateObject(schema, 123)).toThrow(ObjectValidationError);
      });

      it('should throw ObjectValidationError for invalid number', () => {
        const schema = Type.Number();

        expect(() => validator.validateObject(schema, 'not a number')).toThrow(
          ObjectValidationError,
        );
      });

      it('should throw ObjectValidationError for invalid string length', () => {
        const schema = Type.String({ minLength: 5 });

        expect(() => validator.validateObject(schema, 'hi')).toThrow(ObjectValidationError);
      });

      it('should throw ObjectValidationError for missing required fields', () => {
        const schema = Type.Object({
          name: Type.String(),
          email: Type.String(),
        });

        expect(() => validator.validateObject(schema, { name: 'John' })).toThrow(
          ObjectValidationError,
        );
      });

      it('should include validation errors in thrown error', () => {
        const schema = Type.Object({
          name: Type.String(),
          age: Type.Number(),
        });

        try {
          validator.validateObject(schema, { name: 123, age: 'invalid' });
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors.length).toBeGreaterThan(0);
        }
      });
    });

    describe('path formatting', () => {
      it('should format root-level errors as "root"', () => {
        const schema = Type.String();

        try {
          validator.validateObject(schema, 123);
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('root');
        }
      });

      it('should format simple field paths', () => {
        const schema = Type.Object({
          age: Type.Number(),
        });

        try {
          validator.validateObject(schema, { age: 'invalid' });
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('age');
        }
      });

      it('should format nested field paths with dots', () => {
        const schema = Type.Object({
          user: Type.Object({
            age: Type.Number(),
          }),
        });

        try {
          validator.validateObject(schema, { user: { age: 'invalid' } });
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('user.age');
        }
      });

      it('should format array indices with brackets', () => {
        const schema = Type.Array(Type.String());

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
      const schema = Type.Object({
        name: Type.String(),
      });
      const boundValidator = validator.withSchema(schema);

      expect(boundValidator).toHaveProperty('validate');
      expect(typeof boundValidator.validate).toBe('function');
    });

    it('should validate successfully with bound validator', () => {
      const schema = Type.String();
      const boundValidator = validator.withSchema(schema);

      const result = boundValidator.validate('hello');

      expect(result).toBe('hello');
    });

    it('should throw ObjectValidationError with bound validator', () => {
      const schema = Type.String();
      const boundValidator = validator.withSchema(schema);

      expect(() => boundValidator.validate(123)).toThrow(ObjectValidationError);
    });

    it('should be reusable for multiple validations', () => {
      const schema = Type.Number({ minimum: 0 });
      const boundValidator = validator.withSchema(schema);

      expect(boundValidator.validate(5)).toBe(5);
      expect(boundValidator.validate(10)).toBe(10);
      expect(() => boundValidator.validate(-1)).toThrow(ObjectValidationError);
    });
  });

  describe('error cause', () => {
    it('should include original TypeBox errors as cause', () => {
      const schema = Type.String();

      try {
        validator.validateObject(schema, 123);
      } catch (error) {
        expect(error).toBeInstanceOf(ObjectValidationError);
        const validationError = error as ObjectValidationError;
        expect(validationError.cause).toBeDefined();
        expect(Array.isArray(validationError.cause)).toBe(true);
      }
    });
  });
});
