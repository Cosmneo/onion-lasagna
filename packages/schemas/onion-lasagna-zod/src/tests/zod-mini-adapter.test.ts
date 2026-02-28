/**
 * @fileoverview Tests for Zod Mini schema adapter.
 */

import { describe, it, expect } from 'vitest';
import * as z from 'zod/mini';
import { zodMiniSchema } from '../zod-mini.adapter';

describe('zodMiniSchema', () => {
  describe('validation', () => {
    it('validates simple object successfully', () => {
      const schema = zodMiniSchema(
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
      const schema = zodMiniSchema(
        z.object({
          email: z.string().check(z.email()),
        }),
      );

      const result = schema.validate({ email: 'invalid' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toHaveLength(1);
        expect(result.issues[0]!.path).toEqual(['email']);
        expect(result.issues[0]!.message).toBeDefined();
      }
    });

    it('validates nested objects', () => {
      const schema = zodMiniSchema(
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
      const schema = zodMiniSchema(
        z.object({
          user: z.object({
            email: z.string().check(z.email()),
          }),
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
      const schema = zodMiniSchema(z.array(z.string()));

      expect(schema.validate(['a', 'b', 'c']).success).toBe(true);
      expect(schema.validate(['a', 123]).success).toBe(false);
    });

    it('validates optional fields', () => {
      const schema = zodMiniSchema(
        z.object({
          name: z.string(),
          age: z.optional(z.number()),
        }),
      );

      expect(schema.validate({ name: 'John' }).success).toBe(true);
      expect(schema.validate({ name: 'John', age: 30 }).success).toBe(true);
    });

    it('validates unions', () => {
      const schema = zodMiniSchema(z.union([z.string(), z.number()]));

      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate(123).success).toBe(true);
      expect(schema.validate(true).success).toBe(false);
    });

    it('validates enums', () => {
      const schema = zodMiniSchema(z.enum(['pending', 'active', 'completed']));

      expect(schema.validate('pending').success).toBe(true);
      expect(schema.validate('invalid').success).toBe(false);
    });

    it('validates with check constraints', () => {
      const schema = zodMiniSchema(z.string().check(z.minLength(5)));

      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate('hi').success).toBe(false);
    });

    it('includes error code in validation issues', () => {
      const schema = zodMiniSchema(z.string().check(z.minLength(5)));

      const result = schema.validate('hi');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0]!.code).toBeDefined();
      }
    });
  });

  describe('JSON Schema generation', () => {
    it('generates JSON Schema for simple object', () => {
      const schema = zodMiniSchema(
        z.object({
          name: z.string(),
          age: z.number(),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      expect(jsonSchema.properties?.['name']).toEqual({ type: 'string' });
      expect(jsonSchema.properties?.['age']).toEqual({ type: 'number' });
    });

    it('generates required array for non-optional fields', () => {
      const schema = zodMiniSchema(
        z.object({
          name: z.string(),
          age: z.optional(z.number()),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.required).toContain('name');
      expect(jsonSchema.required).not.toContain('age');
    });

    it('generates JSON Schema for arrays', () => {
      const schema = zodMiniSchema(z.array(z.string()));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('array');
      expect(jsonSchema.items).toEqual({ type: 'string' });
    });

    it('includes constraints in JSON Schema', () => {
      const schema = zodMiniSchema(z.string().check(z.minLength(1), z.maxLength(100)));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('string');
      expect(jsonSchema.minLength).toBe(1);
      expect(jsonSchema.maxLength).toBe(100);
    });

    it('does not include $schema property', () => {
      const schema = zodMiniSchema(z.object({ name: z.string() }));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema['$schema']).toBeUndefined();
    });

    it('generates JSON Schema for nested objects', () => {
      const schema = zodMiniSchema(
        z.object({
          user: z.object({
            name: z.string(),
          }),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.properties?.['user']).toBeDefined();
      expect(
        (jsonSchema.properties?.['user'] as { properties?: object }).properties,
      ).toBeDefined();
    });

    it('generates JSON Schema for enums', () => {
      const schema = zodMiniSchema(z.enum(['a', 'b', 'c']));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.enum).toEqual(['a', 'b', 'c']);
    });
  });

  describe('type inference', () => {
    it('exposes _output type marker', () => {
      const schema = zodMiniSchema(z.object({ name: z.string() }));

      expect(schema._output).toBeUndefined();
    });

    it('exposes _input type marker', () => {
      const schema = zodMiniSchema(z.object({ name: z.string() }));

      expect(schema._input).toBeUndefined();
    });

    it('exposes underlying schema', () => {
      const zodObj = z.object({ name: z.string() });
      const schema = zodMiniSchema(zodObj);

      expect(schema._schema).toBe(zodObj);
    });
  });
});
