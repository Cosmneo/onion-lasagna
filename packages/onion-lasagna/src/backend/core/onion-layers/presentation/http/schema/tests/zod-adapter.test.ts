/**
 * @fileoverview Tests for Zod schema adapter.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodSchema } from '../adapters/zod.adapter';

describe('zodSchema', () => {
  describe('validation', () => {
    it('validates simple object successfully', () => {
      const schema = zodSchema(
        z.object({
          name: z.string(),
          age: z.number(),
        }),
      );

      const result = schema.validate({ name: 'John', age: 30 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', age: 30 });
      }
    });

    it('returns validation errors for invalid data', () => {
      const schema = zodSchema(
        z.object({
          email: z.string().email(),
        }),
      );

      const result = schema.validate({ email: 'invalid' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].path).toEqual(['email']);
        expect(result.issues[0].message).toContain('email');
      }
    });

    it('validates nested objects', () => {
      const schema = zodSchema(
        z.object({
          user: z.object({
            profile: z.object({
              name: z.string(),
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
      const schema = zodSchema(
        z.object({
          user: z.object({
            email: z.string().email(),
          }),
        }),
      );

      const result = schema.validate({
        user: { email: 'invalid' },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0].path).toEqual(['user', 'email']);
      }
    });

    it('validates arrays', () => {
      const schema = zodSchema(z.array(z.string()));

      expect(schema.validate(['a', 'b', 'c']).success).toBe(true);
      expect(schema.validate(['a', 123]).success).toBe(false);
    });

    it('validates optional fields', () => {
      const schema = zodSchema(
        z.object({
          name: z.string(),
          age: z.number().optional(),
        }),
      );

      expect(schema.validate({ name: 'John' }).success).toBe(true);
      expect(schema.validate({ name: 'John', age: 30 }).success).toBe(true);
    });

    it('applies transformations', () => {
      const schema = zodSchema(z.string().transform((s) => s.toUpperCase()));

      const result = schema.validate('hello');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('HELLO');
      }
    });

    it('applies coercion', () => {
      const schema = zodSchema(z.coerce.number());

      const result = schema.validate('123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(123);
      }
    });

    it('validates unions', () => {
      const schema = zodSchema(z.union([z.string(), z.number()]));

      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate(123).success).toBe(true);
      expect(schema.validate(true).success).toBe(false);
    });

    it('validates enums', () => {
      const schema = zodSchema(z.enum(['pending', 'active', 'completed']));

      expect(schema.validate('pending').success).toBe(true);
      expect(schema.validate('invalid').success).toBe(false);
    });

    it('includes error code in validation issues', () => {
      const schema = zodSchema(z.string().min(5));

      const result = schema.validate('hi');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0].code).toBeDefined();
      }
    });
  });

  describe('JSON Schema generation', () => {
    it('generates JSON Schema for simple object', () => {
      const schema = zodSchema(
        z.object({
          name: z.string(),
          age: z.number(),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      expect(jsonSchema.properties?.name).toEqual({ type: 'string' });
      expect(jsonSchema.properties?.age).toEqual({ type: 'number' });
    });

    it('generates required array for non-optional fields', () => {
      const schema = zodSchema(
        z.object({
          name: z.string(),
          age: z.number().optional(),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.required).toContain('name');
      expect(jsonSchema.required).not.toContain('age');
    });

    it('generates JSON Schema for arrays', () => {
      const schema = zodSchema(z.array(z.string()));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('array');
      expect(jsonSchema.items).toEqual({ type: 'string' });
    });

    it('includes constraints in JSON Schema', () => {
      const schema = zodSchema(z.string().min(1).max(100));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('string');
      expect(jsonSchema.minLength).toBe(1);
      expect(jsonSchema.maxLength).toBe(100);
    });

    it('includes descriptions in JSON Schema', () => {
      const schema = zodSchema(z.string().describe('User name'));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.description).toBe('User name');
    });

    it('does not include $schema property', () => {
      const schema = zodSchema(z.object({ name: z.string() }));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.$schema).toBeUndefined();
    });

    it('generates JSON Schema for nested objects', () => {
      const schema = zodSchema(
        z.object({
          user: z.object({
            name: z.string(),
          }),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.properties?.user).toBeDefined();
      expect((jsonSchema.properties?.user as { properties?: object }).properties).toBeDefined();
    });

    it('generates JSON Schema for enums', () => {
      const schema = zodSchema(z.enum(['a', 'b', 'c']));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.enum).toEqual(['a', 'b', 'c']);
    });
  });

  describe('type inference', () => {
    it('exposes _output type marker', () => {
      const schema = zodSchema(z.object({ name: z.string() }));

      // Type check - _output should be accessible
      expect(schema._output).toBeUndefined();
    });

    it('exposes _input type marker', () => {
      const schema = zodSchema(z.object({ name: z.string() }));

      // Type check - _input should be accessible
      expect(schema._input).toBeUndefined();
    });

    it('exposes underlying schema', () => {
      const zodObj = z.object({ name: z.string() });
      const schema = zodSchema(zodObj);

      expect(schema._schema).toBe(zodObj);
    });
  });
});
