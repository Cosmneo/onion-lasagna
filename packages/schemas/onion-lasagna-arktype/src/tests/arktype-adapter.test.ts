/**
 * @fileoverview Tests for ArkType schema adapter.
 */

import { describe, it, expect } from 'vitest';
import { type } from 'arktype';
import { arktypeSchema } from '../arktype.adapter';

describe('arktypeSchema', () => {
  describe('validation', () => {
    it('validates simple object successfully', () => {
      const schema = arktypeSchema(
        type({
          name: 'string',
          age: 'number',
        }),
      );

      const result = schema.validate({ name: 'John', age: 30 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', age: 30 });
      }
    });

    it('returns validation errors for invalid data', () => {
      const schema = arktypeSchema(type({ email: 'string.email' }));

      const result = schema.validate({ email: 'invalid' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0]!.path).toEqual(['email']);
        expect(result.issues[0]!.message).toBeDefined();
      }
    });

    it('validates nested objects', () => {
      const schema = arktypeSchema(
        type({
          user: {
            profile: {
              name: 'string',
            },
          },
        }),
      );

      const result = schema.validate({
        user: { profile: { name: 'John' } },
      });

      expect(result.success).toBe(true);
    });

    it('returns path for nested validation errors', () => {
      const schema = arktypeSchema(
        type({
          user: {
            email: 'string.email',
          },
        }),
      );

      const result = schema.validate({
        user: { email: 'invalid' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0]!.path).toEqual(['user', 'email']);
      }
    });

    it('validates arrays', () => {
      const schema = arktypeSchema(type('string[]'));

      expect(schema.validate(['a', 'b', 'c']).success).toBe(true);
      expect(schema.validate(['a', 123]).success).toBe(false);
    });

    it('validates optional fields', () => {
      const schema = arktypeSchema(
        type({
          name: 'string',
          'age?': 'number',
        }),
      );

      expect(schema.validate({ name: 'John' }).success).toBe(true);
      expect(schema.validate({ name: 'John', age: 30 }).success).toBe(true);
    });

    it('validates unions', () => {
      const schema = arktypeSchema(type('string | number'));

      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate(123).success).toBe(true);
      expect(schema.validate(true).success).toBe(false);
    });

    it('validates string literal enums', () => {
      const schema = arktypeSchema(type("'pending' | 'active' | 'completed'"));

      expect(schema.validate('pending').success).toBe(true);
      expect(schema.validate('invalid').success).toBe(false);
    });

    it('validates with string length constraints', () => {
      const schema = arktypeSchema(type('string >= 5'));

      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate('hi').success).toBe(false);
    });

    it('includes error code in validation issues', () => {
      const schema = arktypeSchema(type('string >= 5'));

      const result = schema.validate('hi');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0]!.code).toBeDefined();
      }
    });

    it('includes expected and received in validation issues', () => {
      const schema = arktypeSchema(type('string'));

      const result = schema.validate(123);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0]!.expected).toBeDefined();
        expect(result.issues[0]!.received).toBeDefined();
      }
    });
  });

  describe('JSON Schema generation', () => {
    it('generates JSON Schema for simple object', () => {
      const schema = arktypeSchema(
        type({
          name: 'string',
          age: 'number',
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      expect(jsonSchema.properties?.['name']).toEqual({ type: 'string' });
      expect(jsonSchema.properties?.['age']).toEqual({ type: 'number' });
    });

    it('generates required array for non-optional fields', () => {
      const schema = arktypeSchema(
        type({
          name: 'string',
          'age?': 'number',
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.required).toContain('name');
      expect(jsonSchema.required).not.toContain('age');
    });

    it('generates JSON Schema for arrays', () => {
      const schema = arktypeSchema(type('string[]'));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('array');
      expect(jsonSchema.items).toEqual({ type: 'string' });
    });

    it('includes string constraints in JSON Schema', () => {
      const schema = arktypeSchema(type('1 <= string <= 100'));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('string');
      expect(jsonSchema.minLength).toBe(1);
      expect(jsonSchema.maxLength).toBe(100);
    });

    it('does not include $schema property', () => {
      const schema = arktypeSchema(type({ name: 'string' }));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema['$schema']).toBeUndefined();
    });

    it('generates JSON Schema for nested objects', () => {
      const schema = arktypeSchema(
        type({
          user: {
            name: 'string',
          },
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.properties?.['user']).toBeDefined();
      expect(
        (jsonSchema.properties?.['user'] as { properties?: object }).properties,
      ).toBeDefined();
    });

    it('generates JSON Schema for string literal enums', () => {
      const schema = arktypeSchema(type("'a' | 'b' | 'c'"));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.enum).toBeDefined();
      expect(jsonSchema.enum).toContain('a');
      expect(jsonSchema.enum).toContain('b');
      expect(jsonSchema.enum).toContain('c');
    });

    it('generates JSON Schema for integer constraints', () => {
      const schema = arktypeSchema(type('0 <= number%1 <= 100'));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('integer');
      expect(jsonSchema.minimum).toBe(0);
      expect(jsonSchema.maximum).toBe(100);
    });

    it('generates JSON Schema for unions', () => {
      const schema = arktypeSchema(type('string | number'));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.anyOf ?? jsonSchema.oneOf).toBeDefined();
    });

    it('generates JSON Schema for morph schemas using output type', () => {
      const schema = arktypeSchema(
        type({ age: type('string | number').pipe((v) => Number(v)).to('number%1 >= 0') }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
      expect(props.age.type).toBe('integer');
      expect(props.age.minimum).toBe(0);
    });
  });

  describe('type inference', () => {
    it('exposes _output type marker', () => {
      const schema = arktypeSchema(type({ name: 'string' }));

      expect(schema._output).toBeUndefined();
    });

    it('exposes _input type marker', () => {
      const schema = arktypeSchema(type({ name: 'string' }));

      expect(schema._input).toBeUndefined();
    });

    it('exposes underlying schema', () => {
      const arkObj = type({ name: 'string' });
      const schema = arktypeSchema(arkObj);

      expect(schema._schema).toBe(arkObj);
    });
  });
});
