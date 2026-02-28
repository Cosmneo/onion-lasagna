/**
 * @fileoverview Tests for Zod v3 pagination schemas.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodV3Schema } from '../zod-v3.adapter';
import { pagination } from '../schemas/pagination';

describe('pagination (Zod v3)', () => {
  describe('input', () => {
    it('applies defaults when empty object', () => {
      const schema = zodV3Schema(pagination.input);
      const result = schema.validate({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 1, pageSize: 10 });
      }
    });

    it('coerces string values to numbers', () => {
      const schema = zodV3Schema(pagination.input);
      const result = schema.validate({ page: '3', pageSize: '25' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 3, pageSize: 25 });
      }
    });

    it('validates valid numeric input', () => {
      const schema = zodV3Schema(pagination.input);
      const result = schema.validate({ page: 2, pageSize: 20 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 2, pageSize: 20 });
      }
    });

    it('rejects page < 1', () => {
      const schema = zodV3Schema(pagination.input);
      const result = schema.validate({ page: 0, pageSize: 10 });

      expect(result.success).toBe(false);
    });

    it('rejects pageSize > 100', () => {
      const schema = zodV3Schema(pagination.input);
      const result = schema.validate({ page: 1, pageSize: 101 });

      expect(result.success).toBe(false);
    });

    it('rejects non-integer values', () => {
      const schema = zodV3Schema(pagination.input);
      const result = schema.validate({ page: 1.5, pageSize: 10 });

      expect(result.success).toBe(false);
    });

    it('is composable via .extend()', () => {
      const extended = pagination.input.extend({
        searchTerm: z.string().optional(),
      });
      const schema = zodV3Schema(extended);
      const result = schema.validate({ searchTerm: 'hello' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 1, pageSize: 10, searchTerm: 'hello' });
      }
    });
  });

  describe('response', () => {
    const itemSchema = z.object({ id: z.string(), name: z.string() });

    it('validates valid paginated response', () => {
      const schema = zodV3Schema(pagination.response(itemSchema));
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
      const schema = zodV3Schema(pagination.response(itemSchema));
      const result = schema.validate({ items: [], total: 0 });

      expect(result.success).toBe(true);
    });

    it('rejects invalid items', () => {
      const schema = zodV3Schema(pagination.response(itemSchema));
      const result = schema.validate({
        items: [{ id: 123, name: 'Alice' }],
        total: 1,
      });

      expect(result.success).toBe(false);
    });

    it('rejects missing total', () => {
      const schema = zodV3Schema(pagination.response(itemSchema));
      const result = schema.validate({ items: [] });

      expect(result.success).toBe(false);
    });
  });

  describe('JSON Schema', () => {
    it('input generates JSON Schema with defaults', () => {
      const schema = zodV3Schema(pagination.input);
      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
      expect(props.page.default).toBe(1);
      expect(props.pageSize.default).toBe(10);
    });

    it('response generates JSON Schema with items array', () => {
      const itemSchema = z.object({ id: z.string() });
      const schema = zodV3Schema(pagination.response(itemSchema));
      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
      expect(props.items.type).toBe('array');
    });
  });
});
