import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodObjectValidator, createZodValidator } from '../bootstrap';
import { ZodObjectValidator } from '../object-validator.zod';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('Zod Bootstrap', () => {
  describe('zodObjectValidator singleton', () => {
    it('should be an instance of ZodObjectValidator', () => {
      expect(zodObjectValidator).toBeInstanceOf(ZodObjectValidator);
    });

    it('should have validateObject method', () => {
      expect(typeof zodObjectValidator.validateObject).toBe('function');
    });

    it('should have withSchema method', () => {
      expect(typeof zodObjectValidator.withSchema).toBe('function');
    });

    it('should validate objects correctly', () => {
      const schema = z.object({ name: z.string() });
      const result = zodObjectValidator.validateObject(schema, { name: 'John' });

      expect(result).toEqual({ name: 'John' });
    });
  });

  describe('createZodValidator', () => {
    it('should create a BoundValidator from schema', () => {
      const schema = z.string();
      const validator = createZodValidator(schema);

      expect(validator).toHaveProperty('validate');
      expect(typeof validator.validate).toBe('function');
    });

    it('should validate successfully', () => {
      const schema = z.string().min(1);
      const validator = createZodValidator(schema);

      const result = validator.validate('hello');

      expect(result).toBe('hello');
    });

    it('should throw ObjectValidationError on failure', () => {
      const schema = z.string();
      const validator = createZodValidator(schema);

      expect(() => validator.validate(123)).toThrow(ObjectValidationError);
    });

    it('should work with complex schemas', () => {
      const userSchema = z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        age: z.number().int().positive(),
        tags: z.array(z.string()),
      });
      const validator = createZodValidator(userSchema);

      const validUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        age: 25,
        tags: ['admin', 'user'],
      };

      const result = validator.validate(validUser);

      expect(result).toEqual(validUser);
    });

    it('should work with optional fields', () => {
      const schema = z.object({
        name: z.string(),
        nickname: z.string().optional(),
      });
      const validator = createZodValidator(schema);

      const result = validator.validate({ name: 'John' });

      expect(result).toEqual({ name: 'John' });
    });

    it('should work with default values', () => {
      const schema = z.object({
        name: z.string(),
        role: z.string().default('user'),
      });
      const validator = createZodValidator(schema);

      const result = validator.validate({ name: 'John' });

      expect(result).toEqual({ name: 'John', role: 'user' });
    });

    it('should work with unions', () => {
      const schema = z.union([z.string(), z.number()]);
      const validator = createZodValidator(schema);

      expect(validator.validate('hello')).toBe('hello');
      expect(validator.validate(42)).toBe(42);
      expect(() => validator.validate(true)).toThrow(ObjectValidationError);
    });

    it('should work with enums', () => {
      const schema = z.enum(['admin', 'user', 'guest']);
      const validator = createZodValidator(schema);

      expect(validator.validate('admin')).toBe('admin');
      expect(() => validator.validate('superuser')).toThrow(ObjectValidationError);
    });

    it('should work with refinements', () => {
      const schema = z.string().refine((val) => val.startsWith('prefix_'), {
        message: 'Must start with prefix_',
      });
      const validator = createZodValidator(schema);

      expect(validator.validate('prefix_test')).toBe('prefix_test');
      expect(() => validator.validate('test')).toThrow(ObjectValidationError);
    });

    it('should work with transforms', () => {
      const schema = z.string().transform((val) => val.trim().toLowerCase());
      const validator = createZodValidator(schema);

      const result = validator.validate('  HELLO WORLD  ');

      expect(result).toBe('hello world');
    });
  });
});
