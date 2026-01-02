/**
 * @fileoverview Tests for TypeBox schema adapter.
 */

import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { typeboxSchema } from '../adapters/typebox.adapter';

describe('typeboxSchema', () => {
  describe('validation', () => {
    it('validates simple object successfully', () => {
      const schema = typeboxSchema(
        Type.Object({
          name: Type.String(),
          age: Type.Number(),
        }),
      );

      const result = schema.validate({ name: 'John', age: 30 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', age: 30 });
      }
    });

    it('returns validation errors for invalid data', () => {
      const schema = typeboxSchema(
        Type.Object({
          email: Type.String({ format: 'email' }),
        }),
      );

      const result = schema.validate({ email: 'invalid' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

    it('validates nested objects', () => {
      const schema = typeboxSchema(
        Type.Object({
          user: Type.Object({
            profile: Type.Object({
              name: Type.String(),
            }),
          }),
        }),
      );

      const result = schema.validate({
        user: { profile: { name: 'John' } },
      });

      expect(result.success).toBe(true);
    });

    it('returns path for nested validation errors', () => {
      const schema = typeboxSchema(
        Type.Object({
          user: Type.Object({
            age: Type.Number(),
          }),
        }),
      );

      const result = schema.validate({
        user: { age: 'not a number' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0].path).toContain('user');
        expect(result.issues[0].path).toContain('age');
      }
    });

    it('validates arrays', () => {
      const schema = typeboxSchema(Type.Array(Type.String()));

      expect(schema.validate(['a', 'b', 'c']).success).toBe(true);
      expect(schema.validate(['a', 123]).success).toBe(false);
    });

    it('validates optional fields', () => {
      const schema = typeboxSchema(
        Type.Object({
          name: Type.String(),
          age: Type.Optional(Type.Number()),
        }),
      );

      expect(schema.validate({ name: 'John' }).success).toBe(true);
      expect(schema.validate({ name: 'John', age: 30 }).success).toBe(true);
    });

    it('validates integers with constraints', () => {
      const schema = typeboxSchema(Type.Integer({ minimum: 0, maximum: 100 }));

      expect(schema.validate(50).success).toBe(true);
      expect(schema.validate(150).success).toBe(false);
      expect(schema.validate(-1).success).toBe(false);
    });

    it('validates string patterns', () => {
      const schema = typeboxSchema(Type.String({ pattern: '^[a-z]+$' }));

      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate('HELLO').success).toBe(false);
      expect(schema.validate('hello123').success).toBe(false);
    });

    it('validates unions', () => {
      const schema = typeboxSchema(Type.Union([Type.String(), Type.Number()]));

      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate(123).success).toBe(true);
      expect(schema.validate(true).success).toBe(false);
    });

    it('validates literals', () => {
      const schema = typeboxSchema(
        Type.Union([Type.Literal('pending'), Type.Literal('active'), Type.Literal('completed')]),
      );

      expect(schema.validate('pending').success).toBe(true);
      expect(schema.validate('active').success).toBe(true);
      expect(schema.validate('invalid').success).toBe(false);
    });

    it('includes error message in validation issues', () => {
      const schema = typeboxSchema(Type.String({ minLength: 5 }));

      const result = schema.validate('hi');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0].message).toBeDefined();
      }
    });
  });

  describe('JSON Schema generation', () => {
    it('returns TypeBox schema as JSON Schema', () => {
      const tbSchema = Type.Object({
        name: Type.String(),
        age: Type.Number(),
      });
      const schema = typeboxSchema(tbSchema);

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
    });

    it('preserves required array', () => {
      const schema = typeboxSchema(
        Type.Object({
          name: Type.String(),
          age: Type.Optional(Type.Number()),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.required).toContain('name');
      expect(jsonSchema.required).not.toContain('age');
    });

    it('preserves array schema', () => {
      const schema = typeboxSchema(Type.Array(Type.String()));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('array');
      expect(jsonSchema.items).toBeDefined();
    });

    it('preserves constraints in JSON Schema', () => {
      const schema = typeboxSchema(Type.String({ minLength: 1, maxLength: 100 }));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('string');
      expect(jsonSchema.minLength).toBe(1);
      expect(jsonSchema.maxLength).toBe(100);
    });

    it('preserves descriptions', () => {
      const schema = typeboxSchema(Type.String({ description: 'User name' }));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.description).toBe('User name');
    });

    it('returns a copy to prevent mutation', () => {
      const original = Type.Object({ name: Type.String() });
      const schema = typeboxSchema(original);

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema).not.toBe(original);
    });

    it('preserves nested object structure', () => {
      const schema = typeboxSchema(
        Type.Object({
          user: Type.Object({
            name: Type.String(),
          }),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.properties?.user).toBeDefined();
      expect((jsonSchema.properties?.user as { properties?: object }).properties).toBeDefined();
    });

    it('preserves union schemas', () => {
      const schema = typeboxSchema(Type.Union([Type.Literal('a'), Type.Literal('b')]));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.anyOf || jsonSchema.oneOf).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('handles circular references in error values gracefully', () => {
      const schema = typeboxSchema(Type.String());

      // Create a circular reference
      const circular: Record<string, unknown> = { name: 'test' };
      circular.self = circular;

      // Should not throw - should return validation error with safe stringified value
      const result = schema.validate(circular);

      expect(result.success).toBe(false);
      if (!result.success) {
        // The received value should be safely stringified
        expect(result.issues[0]?.received).toBe('[Complex Object]');
      }
    });

    it('handles BigInt values in error reporting', () => {
      const schema = typeboxSchema(Type.Number());

      // BigInt is not JSON-serializable
      const result = schema.validate(BigInt(12345));

      expect(result.success).toBe(false);
      if (!result.success) {
        // The received value should be the string representation
        expect(result.issues[0]?.received).toBe('12345');
      }
    });
  });

  describe('type inference', () => {
    it('exposes _output type marker', () => {
      const schema = typeboxSchema(Type.Object({ name: Type.String() }));

      expect(schema._output).toBeUndefined();
    });

    it('exposes _input type marker', () => {
      const schema = typeboxSchema(Type.Object({ name: Type.String() }));

      expect(schema._input).toBeUndefined();
    });

    it('exposes underlying schema', () => {
      const tbSchema = Type.Object({ name: Type.String() });
      const schema = typeboxSchema(tbSchema);

      expect(schema._schema).toBe(tbSchema);
    });
  });
});
