/**
 * @fileoverview Tests for Zod v3 schema adapter.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodV3Schema } from '../zod-v3.adapter';

describe('zodV3Schema', () => {
  describe('validation', () => {
    it('validates simple object successfully', () => {
      const schema = zodV3Schema(
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
      const schema = zodV3Schema(
        z.object({
          email: z.string().email(),
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
      const schema = zodV3Schema(
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
      const schema = zodV3Schema(
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
        expect(result.issues[0]!.path).toEqual(['user', 'email']);
      }
    });

    it('validates arrays', () => {
      const schema = zodV3Schema(z.array(z.string()));

      expect(schema.validate(['a', 'b', 'c']).success).toBe(true);
      expect(schema.validate(['a', 123]).success).toBe(false);
    });

    it('validates optional fields', () => {
      const schema = zodV3Schema(
        z.object({
          name: z.string(),
          age: z.number().optional(),
        }),
      );

      expect(schema.validate({ name: 'John' }).success).toBe(true);
      expect(schema.validate({ name: 'John', age: 30 }).success).toBe(true);
    });

    it('applies transformations', () => {
      const schema = zodV3Schema(z.string().transform((s) => s.toUpperCase()));

      const result = schema.validate('hello');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('HELLO');
      }
    });

    it('applies coercion', () => {
      const schema = zodV3Schema(z.coerce.number());

      const result = schema.validate('123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(123);
      }
    });

    it('validates unions', () => {
      const schema = zodV3Schema(z.union([z.string(), z.number()]));

      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate(123).success).toBe(true);
      expect(schema.validate(true).success).toBe(false);
    });

    it('validates enums', () => {
      const schema = zodV3Schema(z.enum(['pending', 'active', 'completed']));

      expect(schema.validate('pending').success).toBe(true);
      expect(schema.validate('invalid').success).toBe(false);
    });

    it('includes error code in validation issues', () => {
      const schema = zodV3Schema(z.string().min(5));

      const result = schema.validate('hi');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0]!.code).toBeDefined();
      }
    });

    it('validates discriminated unions', () => {
      const schema = zodV3Schema(
        z.discriminatedUnion('type', [
          z.object({ type: z.literal('text'), content: z.string() }),
          z.object({ type: z.literal('image'), url: z.string().url() }),
        ]),
      );

      expect(schema.validate({ type: 'text', content: 'hello' }).success).toBe(true);
      expect(schema.validate({ type: 'image', url: 'https://example.com/img.png' }).success).toBe(
        true,
      );
      expect(schema.validate({ type: 'video' }).success).toBe(false);
    });
  });

  describe('JSON Schema generation', () => {
    it('generates JSON Schema for simple object', () => {
      const schema = zodV3Schema(
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
      const schema = zodV3Schema(
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
      const schema = zodV3Schema(z.array(z.string()));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('array');
      expect(jsonSchema.items).toEqual({ type: 'string' });
    });

    it('includes constraints in JSON Schema', () => {
      const schema = zodV3Schema(z.string().min(1).max(100));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('string');
      expect(jsonSchema.minLength).toBe(1);
      expect(jsonSchema.maxLength).toBe(100);
    });

    it('includes descriptions in JSON Schema', () => {
      const schema = zodV3Schema(z.string().describe('User name'));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.description).toBe('User name');
    });

    it('does not include $schema property', () => {
      const schema = zodV3Schema(z.object({ name: z.string() }));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema['$schema']).toBeUndefined();
    });

    it('generates JSON Schema for nested objects', () => {
      const schema = zodV3Schema(
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
      const schema = zodV3Schema(z.enum(['a', 'b', 'c']));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.enum).toEqual(['a', 'b', 'c']);
    });

    it('generates JSON Schema for number constraints', () => {
      const schema = zodV3Schema(z.number().int().min(0).max(100));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('integer');
      expect(jsonSchema.minimum).toBe(0);
      expect(jsonSchema.maximum).toBe(100);
    });

    it('generates JSON Schema for unions', () => {
      const schema = zodV3Schema(z.union([z.string(), z.number()]));

      const jsonSchema = schema.toJsonSchema();

      // OpenAPI 3.0 uses anyOf for unions (not oneOf)
      expect(jsonSchema.anyOf ?? jsonSchema.oneOf).toBeDefined();
    });

    it('does not include additionalProperties: false', () => {
      const schema = zodV3Schema(
        z.object({
          name: z.string(),
          age: z.number(),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      // Zod strips extra keys but doesn't reject them.
      // additionalProperties: false would cause OpenAPI validators to reject valid requests.
      expect(jsonSchema.additionalProperties).toBeUndefined();
    });

    it('strips additionalProperties: false from nested objects', () => {
      const schema = zodV3Schema(
        z.object({
          user: z.object({
            name: z.string(),
          }),
        }),
      );

      const jsonSchema = schema.toJsonSchema();
      const userSchema = jsonSchema.properties?.['user'] as Record<string, unknown> | undefined;

      expect(jsonSchema.additionalProperties).toBeUndefined();
      expect(userSchema?.['additionalProperties']).toBeUndefined();
    });
  });

  describe('type inference', () => {
    it('exposes _output type marker', () => {
      const schema = zodV3Schema(z.object({ name: z.string() }));

      expect(schema._output).toBeUndefined();
    });

    it('exposes _input type marker', () => {
      const schema = zodV3Schema(z.object({ name: z.string() }));

      expect(schema._input).toBeUndefined();
    });

    it('exposes underlying schema', () => {
      const zodObj = z.object({ name: z.string() });
      const schema = zodV3Schema(zodObj);

      expect(schema._schema).toBe(zodObj);
    });
  });
});
