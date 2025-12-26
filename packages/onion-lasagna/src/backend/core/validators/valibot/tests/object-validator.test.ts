import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { ValibotObjectValidator } from '../object-validator.valibot';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('ValibotObjectValidator', () => {
  const validator = new ValibotObjectValidator();

  describe('validateObject', () => {
    describe('successful validation', () => {
      it('should validate a simple string', () => {
        const schema = v.string();
        const result = validator.validateObject(schema, 'hello');

        expect(result).toBe('hello');
      });

      it('should validate a number', () => {
        const schema = v.number();
        const result = validator.validateObject(schema, 42);

        expect(result).toBe(42);
      });

      it('should validate a boolean', () => {
        const schema = v.boolean();
        const result = validator.validateObject(schema, true);

        expect(result).toBe(true);
      });

      it('should validate a simple object', () => {
        const schema = v.object({
          name: v.string(),
          age: v.number(),
        });
        const input = { name: 'John', age: 30 };

        const result = validator.validateObject(schema, input);

        expect(result).toEqual(input);
      });

      it('should validate an array', () => {
        const schema = v.array(v.string());
        const input = ['a', 'b', 'c'];

        const result = validator.validateObject(schema, input);

        expect(result).toEqual(input);
      });

      it('should validate nested objects', () => {
        const schema = v.object({
          user: v.object({
            email: v.pipe(v.string(), v.email()),
            profile: v.object({
              name: v.string(),
            }),
          }),
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

      it('should transform values with schema transforms', () => {
        const schema = v.pipe(
          v.string(),
          v.transform((s) => s.toUpperCase()),
        );
        const result = validator.validateObject(schema, 'hello');

        expect(result).toBe('HELLO');
      });
    });

    describe('validation failures', () => {
      it('should throw ObjectValidationError for invalid string', () => {
        const schema = v.string();

        expect(() => validator.validateObject(schema, 123)).toThrow(ObjectValidationError);
      });

      it('should throw ObjectValidationError for invalid number', () => {
        const schema = v.number();

        expect(() => validator.validateObject(schema, 'not a number')).toThrow(
          ObjectValidationError,
        );
      });

      it('should throw ObjectValidationError for invalid email', () => {
        const schema = v.pipe(v.string(), v.email());

        expect(() => validator.validateObject(schema, 'invalid-email')).toThrow(
          ObjectValidationError,
        );
      });

      it('should throw ObjectValidationError for missing required fields', () => {
        const schema = v.object({
          name: v.string(),
          email: v.string(),
        });

        expect(() => validator.validateObject(schema, { name: 'John' })).toThrow(
          ObjectValidationError,
        );
      });

      it('should include validation errors in thrown error', () => {
        const schema = v.object({
          name: v.string(),
          email: v.pipe(v.string(), v.email()),
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
        const schema = v.string();

        try {
          validator.validateObject(schema, 123);
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('root');
        }
      });

      it('should format simple field paths', () => {
        const schema = v.object({
          email: v.pipe(v.string(), v.email()),
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
        const schema = v.object({
          user: v.object({
            email: v.pipe(v.string(), v.email()),
          }),
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
        const schema = v.array(v.string());

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
      const schema = v.object({
        name: v.string(),
      });
      const boundValidator = validator.withSchema(schema);

      expect(boundValidator).toHaveProperty('validate');
      expect(typeof boundValidator.validate).toBe('function');
    });

    it('should validate successfully with bound validator', () => {
      const schema = v.string();
      const boundValidator = validator.withSchema(schema);

      const result = boundValidator.validate('hello');

      expect(result).toBe('hello');
    });

    it('should throw ObjectValidationError with bound validator', () => {
      const schema = v.string();
      const boundValidator = validator.withSchema(schema);

      expect(() => boundValidator.validate(123)).toThrow(ObjectValidationError);
    });

    it('should be reusable for multiple validations', () => {
      const schema = v.pipe(v.number(), v.minValue(0));
      const boundValidator = validator.withSchema(schema);

      expect(boundValidator.validate(5)).toBe(5);
      expect(boundValidator.validate(10)).toBe(10);
      expect(() => boundValidator.validate(-1)).toThrow(ObjectValidationError);
    });
  });

  describe('error cause', () => {
    it('should include original Valibot issues as cause', () => {
      const schema = v.string();

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
