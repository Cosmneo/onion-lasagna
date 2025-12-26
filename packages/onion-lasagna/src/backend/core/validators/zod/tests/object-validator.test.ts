import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ZodObjectValidator } from '../object-validator.zod';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('ZodObjectValidator', () => {
  const validator = new ZodObjectValidator();

  describe('validateObject', () => {
    describe('successful validation', () => {
      it('should validate a simple string', () => {
        const schema = z.string();
        const result = validator.validateObject(schema, 'hello');

        expect(result).toBe('hello');
      });

      it('should validate a number', () => {
        const schema = z.number();
        const result = validator.validateObject(schema, 42);

        expect(result).toBe(42);
      });

      it('should validate a boolean', () => {
        const schema = z.boolean();
        const result = validator.validateObject(schema, true);

        expect(result).toBe(true);
      });

      it('should validate a simple object', () => {
        const schema = z.object({
          name: z.string(),
          age: z.number(),
        });
        const input = { name: 'John', age: 30 };

        const result = validator.validateObject(schema, input);

        expect(result).toEqual(input);
      });

      it('should validate an array', () => {
        const schema = z.array(z.string());
        const input = ['a', 'b', 'c'];

        const result = validator.validateObject(schema, input);

        expect(result).toEqual(input);
      });

      it('should validate nested objects', () => {
        const schema = z.object({
          user: z.object({
            email: z.string().email(),
            profile: z.object({
              name: z.string(),
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
        const schema = z.string().transform((s) => s.toUpperCase());
        const result = validator.validateObject(schema, 'hello');

        expect(result).toBe('HELLO');
      });
    });

    describe('validation failures', () => {
      it('should throw ObjectValidationError for invalid string', () => {
        const schema = z.string();

        expect(() => validator.validateObject(schema, 123)).toThrow(ObjectValidationError);
      });

      it('should throw ObjectValidationError for invalid number', () => {
        const schema = z.number();

        expect(() => validator.validateObject(schema, 'not a number')).toThrow(
          ObjectValidationError,
        );
      });

      it('should throw ObjectValidationError for invalid email', () => {
        const schema = z.string().email();

        expect(() => validator.validateObject(schema, 'invalid-email')).toThrow(
          ObjectValidationError,
        );
      });

      it('should throw ObjectValidationError for missing required fields', () => {
        const schema = z.object({
          name: z.string(),
          email: z.string(),
        });

        expect(() => validator.validateObject(schema, { name: 'John' })).toThrow(
          ObjectValidationError,
        );
      });

      it('should include validation errors in thrown error', () => {
        const schema = z.object({
          name: z.string(),
          email: z.string().email(),
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
        const schema = z.string();

        try {
          validator.validateObject(schema, 123);
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('root');
        }
      });

      it('should format simple field paths', () => {
        const schema = z.object({
          email: z.string().email(),
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
        const schema = z.object({
          user: z.object({
            email: z.string().email(),
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
        const schema = z.array(z.string());

        try {
          validator.validateObject(schema, ['valid', 123, 'also valid']);
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('[1]');
        }
      });

      it('should format nested array paths', () => {
        const schema = z.object({
          items: z.array(
            z.object({
              name: z.string(),
            }),
          ),
        });

        try {
          validator.validateObject(schema, { items: [{ name: 'valid' }, { name: 123 }] });
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors[0]?.field).toBe('items[1].name');
        }
      });
    });

    describe('multiple errors', () => {
      it('should collect multiple validation errors', () => {
        const schema = z.object({
          name: z.string(),
          email: z.string().email(),
          age: z.number().positive(),
        });

        try {
          validator.validateObject(schema, {
            name: 123,
            email: 'invalid',
            age: -5,
          });
        } catch (error) {
          expect(error).toBeInstanceOf(ObjectValidationError);
          const validationError = error as ObjectValidationError;
          expect(validationError.validationErrors.length).toBe(3);
        }
      });
    });
  });

  describe('withSchema', () => {
    it('should create a bound validator', () => {
      const schema = z.object({
        name: z.string(),
      });
      const boundValidator = validator.withSchema(schema);

      expect(boundValidator).toHaveProperty('validate');
      expect(typeof boundValidator.validate).toBe('function');
    });

    it('should validate successfully with bound validator', () => {
      const schema = z.string();
      const boundValidator = validator.withSchema(schema);

      const result = boundValidator.validate('hello');

      expect(result).toBe('hello');
    });

    it('should throw ObjectValidationError with bound validator', () => {
      const schema = z.string();
      const boundValidator = validator.withSchema(schema);

      expect(() => boundValidator.validate(123)).toThrow(ObjectValidationError);
    });

    it('should be reusable for multiple validations', () => {
      const schema = z.number().positive();
      const boundValidator = validator.withSchema(schema);

      expect(boundValidator.validate(5)).toBe(5);
      expect(boundValidator.validate(10)).toBe(10);
      expect(() => boundValidator.validate(-1)).toThrow(ObjectValidationError);
    });
  });

  describe('error cause', () => {
    it('should include original Zod error as cause', () => {
      const schema = z.string();

      try {
        validator.validateObject(schema, 123);
      } catch (error) {
        expect(error).toBeInstanceOf(ObjectValidationError);
        const validationError = error as ObjectValidationError;
        expect(validationError.cause).toBeDefined();
        expect(validationError.cause).toBeInstanceOf(z.ZodError);
      }
    });
  });
});
