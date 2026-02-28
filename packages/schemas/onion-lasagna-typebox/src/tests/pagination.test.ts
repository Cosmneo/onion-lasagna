/**
 * @fileoverview Tests for TypeBox pagination schemas.
 *
 * Note: TypeBox does not perform coercion — it relies on JSON Schema `default`
 * annotations and delegates coercion to the framework (e.g., Fastify).
 * Tests here validate the schema structure and numeric validation.
 */

import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { typeboxSchema } from '../typebox.adapter';
import { pagination } from '../schemas/pagination';

describe('pagination (TypeBox)', () => {
  describe('input', () => {
    it('validates valid numeric input', () => {
      const schema = typeboxSchema(pagination.input);
      const result = schema.validate({ page: 2, pageSize: 20 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 2, pageSize: 20 });
      }
    });

    it('validates with optional fields omitted', () => {
      const schema = typeboxSchema(pagination.input);
      const result = schema.validate({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('rejects page < 1', () => {
      const schema = typeboxSchema(pagination.input);
      const result = schema.validate({ page: 0, pageSize: 10 });

      expect(result.success).toBe(false);
    });

    it('rejects pageSize > 100', () => {
      const schema = typeboxSchema(pagination.input);
      const result = schema.validate({ page: 1, pageSize: 101 });

      expect(result.success).toBe(false);
    });

    it('rejects non-integer values', () => {
      const schema = typeboxSchema(pagination.input);
      const result = schema.validate({ page: 1.5, pageSize: 10 });

      expect(result.success).toBe(false);
    });

    it('is composable via Type.Intersect', () => {
      const extended = Type.Intersect([
        pagination.input,
        Type.Object({ searchTerm: Type.Optional(Type.String()) }),
      ]);
      const schema = typeboxSchema(extended);
      const result = schema.validate({ page: 1, searchTerm: 'hello' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 1, searchTerm: 'hello' });
      }
    });
  });

  describe('response', () => {
    const itemSchema = Type.Object({
      id: Type.String(),
      name: Type.String(),
    });

    it('validates valid paginated response', () => {
      const schema = typeboxSchema(pagination.response(itemSchema));
      const result = schema.validate({
        items: [{ id: '1', name: 'Alice' }],
        total: 1,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.total).toBe(1);
      }
    });

    it('validates empty items array', () => {
      const schema = typeboxSchema(pagination.response(itemSchema));
      const result = schema.validate({ items: [], total: 0 });

      expect(result.success).toBe(true);
    });

    it('rejects invalid items', () => {
      const schema = typeboxSchema(pagination.response(itemSchema));
      const result = schema.validate({
        items: [{ id: 123, name: 'Alice' }],
        total: 1,
      });

      expect(result.success).toBe(false);
    });

    it('rejects missing total', () => {
      const schema = typeboxSchema(pagination.response(itemSchema));
      const result = schema.validate({ items: [] });

      expect(result.success).toBe(false);
    });
  });

  describe('JSON Schema', () => {
    it('input generates JSON Schema with defaults', () => {
      const schema = typeboxSchema(pagination.input);
      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
      expect(props.page.default).toBe(1);
      expect(props.pageSize.default).toBe(10);
    });

    it('response generates JSON Schema with items array', () => {
      const itemSchema = Type.Object({ id: Type.String() });
      const schema = typeboxSchema(pagination.response(itemSchema));
      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
      expect(props.items.type).toBe('array');
    });
  });
});
