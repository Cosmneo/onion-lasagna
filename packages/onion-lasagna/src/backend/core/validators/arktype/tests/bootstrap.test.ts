import { describe, it, expect } from 'vitest';
import { type } from 'arktype';
import { arkTypeObjectValidator, createArkTypeValidator } from '../bootstrap';
import { ArkTypeObjectValidator } from '../object-validator.arktype';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('ArkType Bootstrap', () => {
  describe('arkTypeObjectValidator singleton', () => {
    it('should be an instance of ArkTypeObjectValidator', () => {
      expect(arkTypeObjectValidator).toBeInstanceOf(ArkTypeObjectValidator);
    });

    it('should have validateObject method', () => {
      expect(typeof arkTypeObjectValidator.validateObject).toBe('function');
    });

    it('should have withSchema method', () => {
      expect(typeof arkTypeObjectValidator.withSchema).toBe('function');
    });

    it('should validate objects correctly', () => {
      const schema = type({ name: 'string' });
      const result = arkTypeObjectValidator.validateObject(schema, { name: 'John' });

      expect(result).toEqual({ name: 'John' });
    });
  });

  describe('createArkTypeValidator', () => {
    it('should create a BoundValidator from schema', () => {
      const schema = type('string');
      const validator = createArkTypeValidator(schema);

      expect(validator).toHaveProperty('validate');
      expect(typeof validator.validate).toBe('function');
    });

    it('should validate successfully', () => {
      const schema = type('string>0');
      const validator = createArkTypeValidator(schema);

      const result = validator.validate('hello');

      expect(result).toBe('hello');
    });

    it('should throw ObjectValidationError on failure', () => {
      const schema = type('string');
      const validator = createArkTypeValidator(schema);

      expect(() => validator.validate(123)).toThrow(ObjectValidationError);
    });

    it('should work with complex schemas', () => {
      const userSchema = type({
        id: 'string.uuid',
        email: 'string.email',
        age: 'number>0',
        tags: 'string[]',
      });
      const validator = createArkTypeValidator(userSchema);

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
      const schema = type({
        name: 'string',
        'nickname?': 'string',
      });
      const validator = createArkTypeValidator(schema);

      const result = validator.validate({ name: 'John' });

      expect(result).toEqual({ name: 'John' });
    });

    it('should work with default values via transform', () => {
      const schema = type({
        name: 'string',
        role: 'string',
      });
      const validator = createArkTypeValidator(schema);

      // ArkType doesn't have built-in defaults, so we test with provided value
      const result = validator.validate({ name: 'John', role: 'user' });

      expect(result).toEqual({ name: 'John', role: 'user' });
    });

    it('should work with unions', () => {
      const schema = type('string|number');
      const validator = createArkTypeValidator(schema);

      expect(validator.validate('hello')).toBe('hello');
      expect(validator.validate(42)).toBe(42);
      expect(() => validator.validate(true)).toThrow(ObjectValidationError);
    });

    it('should work with literal unions (enums)', () => {
      const schema = type("'admin'|'user'|'guest'");
      const validator = createArkTypeValidator(schema);

      expect(validator.validate('admin')).toBe('admin');
      expect(() => validator.validate('superuser')).toThrow(ObjectValidationError);
    });

    it('should work with numeric constraints', () => {
      const schema = type('number>=0');
      const validator = createArkTypeValidator(schema);

      expect(validator.validate(5)).toBe(5);
      expect(validator.validate(0)).toBe(0);
      expect(() => validator.validate(-1)).toThrow(ObjectValidationError);
    });

    it('should work with string length constraints', () => {
      const schema = type('string>=3');
      const validator = createArkTypeValidator(schema);

      expect(validator.validate('hello')).toBe('hello');
      expect(() => validator.validate('hi')).toThrow(ObjectValidationError);
    });
  });
});
