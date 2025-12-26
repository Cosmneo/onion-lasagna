import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { valibotObjectValidator, createValibotValidator } from '../bootstrap';
import { ValibotObjectValidator } from '../object-validator.valibot';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('Valibot Bootstrap', () => {
  describe('valibotObjectValidator singleton', () => {
    it('should be an instance of ValibotObjectValidator', () => {
      expect(valibotObjectValidator).toBeInstanceOf(ValibotObjectValidator);
    });

    it('should have validateObject method', () => {
      expect(typeof valibotObjectValidator.validateObject).toBe('function');
    });

    it('should have withSchema method', () => {
      expect(typeof valibotObjectValidator.withSchema).toBe('function');
    });

    it('should validate objects correctly', () => {
      const schema = v.object({ name: v.string() });
      const result = valibotObjectValidator.validateObject(schema, { name: 'John' });

      expect(result).toEqual({ name: 'John' });
    });
  });

  describe('createValibotValidator', () => {
    it('should create a BoundValidator from schema', () => {
      const schema = v.string();
      const validator = createValibotValidator(schema);

      expect(validator).toHaveProperty('validate');
      expect(typeof validator.validate).toBe('function');
    });

    it('should validate successfully', () => {
      const schema = v.pipe(v.string(), v.minLength(1));
      const validator = createValibotValidator(schema);

      const result = validator.validate('hello');

      expect(result).toBe('hello');
    });

    it('should throw ObjectValidationError on failure', () => {
      const schema = v.string();
      const validator = createValibotValidator(schema);

      expect(() => validator.validate(123)).toThrow(ObjectValidationError);
    });

    it('should work with complex schemas', () => {
      const userSchema = v.object({
        id: v.pipe(v.string(), v.uuid()),
        email: v.pipe(v.string(), v.email()),
        age: v.pipe(v.number(), v.integer(), v.minValue(0)),
        tags: v.array(v.string()),
      });
      const validator = createValibotValidator(userSchema);

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
      const schema = v.object({
        name: v.string(),
        nickname: v.optional(v.string()),
      });
      const validator = createValibotValidator(schema);

      const result = validator.validate({ name: 'John' });

      expect(result).toEqual({ name: 'John' });
    });

    it('should work with default values', () => {
      const schema = v.object({
        name: v.string(),
        role: v.optional(v.string(), 'user'),
      });
      const validator = createValibotValidator(schema);

      const result = validator.validate({ name: 'John' });

      expect(result).toEqual({ name: 'John', role: 'user' });
    });

    it('should work with unions', () => {
      const schema = v.union([v.string(), v.number()]);
      const validator = createValibotValidator(schema);

      expect(validator.validate('hello')).toBe('hello');
      expect(validator.validate(42)).toBe(42);
      expect(() => validator.validate(true)).toThrow(ObjectValidationError);
    });

    it('should work with enums', () => {
      const schema = v.picklist(['admin', 'user', 'guest']);
      const validator = createValibotValidator(schema);

      expect(validator.validate('admin')).toBe('admin');
      expect(() => validator.validate('superuser')).toThrow(ObjectValidationError);
    });

    it('should work with custom validation', () => {
      const schema = v.pipe(
        v.string(),
        v.check((val) => val.startsWith('prefix_'), 'Must start with prefix_'),
      );
      const validator = createValibotValidator(schema);

      expect(validator.validate('prefix_test')).toBe('prefix_test');
      expect(() => validator.validate('test')).toThrow(ObjectValidationError);
    });

    it('should work with transforms', () => {
      const schema = v.pipe(
        v.string(),
        v.transform((val) => val.trim().toLowerCase()),
      );
      const validator = createValibotValidator(schema);

      const result = validator.validate('  HELLO WORLD  ');

      expect(result).toBe('hello world');
    });
  });
});
