import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { typeBoxObjectValidator, createTypeBoxValidator } from '../bootstrap';
import { TypeBoxObjectValidator } from '../object-validator.typebox';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('TypeBox Bootstrap', () => {
  describe('typeBoxObjectValidator singleton', () => {
    it('should be an instance of TypeBoxObjectValidator', () => {
      expect(typeBoxObjectValidator).toBeInstanceOf(TypeBoxObjectValidator);
    });

    it('should have validateObject method', () => {
      expect(typeof typeBoxObjectValidator.validateObject).toBe('function');
    });

    it('should have withSchema method', () => {
      expect(typeof typeBoxObjectValidator.withSchema).toBe('function');
    });

    it('should validate objects correctly', () => {
      const schema = Type.Object({ name: Type.String() });
      const result = typeBoxObjectValidator.validateObject(schema, { name: 'John' });

      expect(result).toEqual({ name: 'John' });
    });
  });

  describe('createTypeBoxValidator', () => {
    it('should create a BoundValidator from schema', () => {
      const schema = Type.String();
      const validator = createTypeBoxValidator<string>(schema);

      expect(validator).toHaveProperty('validate');
      expect(typeof validator.validate).toBe('function');
    });

    it('should validate successfully', () => {
      const schema = Type.String({ minLength: 1 });
      const validator = createTypeBoxValidator<string>(schema);

      const result = validator.validate('hello');

      expect(result).toBe('hello');
    });

    it('should throw ObjectValidationError on failure', () => {
      const schema = Type.String();
      const validator = createTypeBoxValidator<string>(schema);

      expect(() => validator.validate(123)).toThrow(ObjectValidationError);
    });

    it('should work with complex schemas', () => {
      interface User {
        id: string;
        name: string;
        age: number;
        tags: string[];
      }
      const userSchema = Type.Object({
        id: Type.String({ minLength: 1 }),
        name: Type.String({ minLength: 1 }),
        age: Type.Integer({ minimum: 0 }),
        tags: Type.Array(Type.String()),
      });
      const validator = createTypeBoxValidator<User>(userSchema);

      const validUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        age: 25,
        tags: ['admin', 'user'],
      };

      const result = validator.validate(validUser);

      expect(result).toEqual(validUser);
    });

    it('should work with optional fields', () => {
      const schema = Type.Object({
        name: Type.String(),
        nickname: Type.Optional(Type.String()),
      });
      const validator = createTypeBoxValidator<{ name: string; nickname?: string }>(schema);

      const result = validator.validate({ name: 'John' });

      expect(result).toEqual({ name: 'John' });
    });

    it('should work with default values', () => {
      const schema = Type.Object({
        name: Type.String(),
        role: Type.String({ default: 'user' }),
      });
      const validator = createTypeBoxValidator<{ name: string; role: string }>(schema);

      const result = validator.validate({ name: 'John', role: 'admin' });

      expect(result).toEqual({ name: 'John', role: 'admin' });
    });

    it('should work with unions', () => {
      const schema = Type.Union([Type.String(), Type.Number()]);
      const validator = createTypeBoxValidator<string | number>(schema);

      expect(validator.validate('hello')).toBe('hello');
      expect(validator.validate(42)).toBe(42);
      expect(() => validator.validate(true)).toThrow(ObjectValidationError);
    });

    it('should work with literal unions (enums)', () => {
      const schema = Type.Union([
        Type.Literal('admin'),
        Type.Literal('user'),
        Type.Literal('guest'),
      ]);
      const validator = createTypeBoxValidator<'admin' | 'user' | 'guest'>(schema);

      expect(validator.validate('admin')).toBe('admin');
      expect(() => validator.validate('superuser')).toThrow(ObjectValidationError);
    });

    it('should work with numeric constraints', () => {
      const schema = Type.Number({ minimum: 0 });
      const validator = createTypeBoxValidator<number>(schema);

      expect(validator.validate(5)).toBe(5);
      expect(validator.validate(0)).toBe(0);
      expect(() => validator.validate(-1)).toThrow(ObjectValidationError);
    });

    it('should work with string length constraints', () => {
      const schema = Type.String({ minLength: 3 });
      const validator = createTypeBoxValidator<string>(schema);

      expect(validator.validate('hello')).toBe('hello');
      expect(() => validator.validate('hi')).toThrow(ObjectValidationError);
    });
  });
});
