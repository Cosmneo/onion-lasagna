/**
 * @fileoverview Tests for Valibot schema adapter.
 */

import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { valibotSchema } from '../valibot.adapter';

describe('valibotSchema', () => {
  describe('validation', () => {
    it('validates simple object successfully', () => {
      const schema = valibotSchema(
        v.object({
          name: v.string(),
          age: v.number(),
        }),
      );

      const result = schema.validate({ name: 'John', age: 30 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', age: 30 });
      }
    });

    it('returns validation errors for invalid data', () => {
      const schema = valibotSchema(
        v.object({
          email: v.pipe(v.string(), v.email()),
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
      const schema = valibotSchema(
        v.object({
          user: v.object({
            profile: v.object({
              name: v.string(),
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
      const schema = valibotSchema(
        v.object({
          user: v.object({
            email: v.pipe(v.string(), v.email()),
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
      const schema = valibotSchema(v.array(v.string()));

      expect(schema.validate(['a', 'b', 'c']).success).toBe(true);
      expect(schema.validate(['a', 123]).success).toBe(false);
    });

    it('validates optional fields', () => {
      const schema = valibotSchema(
        v.object({
          name: v.string(),
          age: v.optional(v.number()),
        }),
      );

      expect(schema.validate({ name: 'John' }).success).toBe(true);
      expect(schema.validate({ name: 'John', age: 30 }).success).toBe(true);
    });

    it('applies transformations', () => {
      const schema = valibotSchema(
        v.pipe(
          v.string(),
          v.transform((s) => s.toUpperCase()),
        ),
      );

      const result = schema.validate('hello');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('HELLO');
      }
    });

    it('validates unions', () => {
      const schema = valibotSchema(v.union([v.string(), v.number()]));

      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate(123).success).toBe(true);
      expect(schema.validate(true).success).toBe(false);
    });

    it('validates picklist enums', () => {
      const schema = valibotSchema(v.picklist(['pending', 'active', 'completed']));

      expect(schema.validate('pending').success).toBe(true);
      expect(schema.validate('invalid').success).toBe(false);
    });

    it('validates with pipe constraints', () => {
      const schema = valibotSchema(v.pipe(v.string(), v.minLength(5)));

      expect(schema.validate('hello').success).toBe(true);
      expect(schema.validate('hi').success).toBe(false);
    });

    it('includes error code in validation issues', () => {
      const schema = valibotSchema(v.pipe(v.string(), v.minLength(5)));

      const result = schema.validate('hi');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues[0]!.code).toBeDefined();
      }
    });

    it('includes expected and received in validation issues', () => {
      const schema = valibotSchema(v.string());

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
      const schema = valibotSchema(
        v.object({
          name: v.string(),
          age: v.number(),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      expect(jsonSchema.properties?.['name']).toEqual({ type: 'string' });
      expect(jsonSchema.properties?.['age']).toEqual({ type: 'number' });
    });

    it('generates required array for non-optional fields', () => {
      const schema = valibotSchema(
        v.object({
          name: v.string(),
          age: v.optional(v.number()),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.required).toContain('name');
      expect(jsonSchema.required).not.toContain('age');
    });

    it('generates JSON Schema for arrays', () => {
      const schema = valibotSchema(v.array(v.string()));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('array');
      expect(jsonSchema.items).toEqual({ type: 'string' });
    });

    it('includes constraints in JSON Schema', () => {
      const schema = valibotSchema(v.pipe(v.string(), v.minLength(1), v.maxLength(100)));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('string');
      expect(jsonSchema.minLength).toBe(1);
      expect(jsonSchema.maxLength).toBe(100);
    });

    it('does not include $schema property', () => {
      const schema = valibotSchema(v.object({ name: v.string() }));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema['$schema']).toBeUndefined();
    });

    it('generates JSON Schema for nested objects', () => {
      const schema = valibotSchema(
        v.object({
          user: v.object({
            name: v.string(),
          }),
        }),
      );

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.properties?.['user']).toBeDefined();
      expect((jsonSchema.properties?.['user'] as { properties?: object }).properties).toBeDefined();
    });

    it('generates JSON Schema for picklist enums', () => {
      const schema = valibotSchema(v.picklist(['a', 'b', 'c']));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.enum).toEqual(['a', 'b', 'c']);
    });

    it('generates JSON Schema for number constraints', () => {
      const schema = valibotSchema(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100)));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('integer');
      expect(jsonSchema.minimum).toBe(0);
      expect(jsonSchema.maximum).toBe(100);
    });

    it('generates JSON Schema for unions', () => {
      const schema = valibotSchema(v.union([v.string(), v.number()]));

      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.anyOf ?? jsonSchema.oneOf).toBeDefined();
    });
  });

  describe('type inference', () => {
    it('exposes _output type marker', () => {
      const schema = valibotSchema(v.object({ name: v.string() }));

      expect(schema._output).toBeUndefined();
    });

    it('exposes _input type marker', () => {
      const schema = valibotSchema(v.object({ name: v.string() }));

      expect(schema._input).toBeUndefined();
    });

    it('exposes underlying schema', () => {
      const vObj = v.object({ name: v.string() });
      const schema = valibotSchema(vObj);

      expect(schema._schema).toBe(vObj);
    });
  });
});
