/**
 * @fileoverview Tests for Zod Mini pagination schemas.
 */

import { describe, it, expect } from 'vitest';
import * as zm from 'zod/mini';
import { zodMiniSchema } from '../zod-mini.adapter';
import { paginationMini } from '../schemas/pagination-mini';

describe('paginationMini (Zod Mini)', () => {
  describe('input', () => {
    it('applies defaults when empty object', () => {
      const schema = zodMiniSchema(paginationMini.input);
      const result = schema.validate({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 1, pageSize: 10 });
      }
    });

    it('coerces string values to numbers', () => {
      const schema = zodMiniSchema(paginationMini.input);
      const result = schema.validate({ page: '3', pageSize: '25' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 3, pageSize: 25 });
      }
    });

    it('validates valid numeric input', () => {
      const schema = zodMiniSchema(paginationMini.input);
      const result = schema.validate({ page: 2, pageSize: 20 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 2, pageSize: 20 });
      }
    });

    it('rejects page < 1', () => {
      const schema = zodMiniSchema(paginationMini.input);
      const result = schema.validate({ page: 0, pageSize: 10 });

      expect(result.success).toBe(false);
    });

    it('rejects pageSize > 100', () => {
      const schema = zodMiniSchema(paginationMini.input);
      const result = schema.validate({ page: 1, pageSize: 101 });

      expect(result.success).toBe(false);
    });

    it('rejects non-integer values', () => {
      const schema = zodMiniSchema(paginationMini.input);
      const result = schema.validate({ page: 1.5, pageSize: 10 });

      expect(result.success).toBe(false);
    });
  });

  describe('response', () => {
    const itemSchema = zm.object({ id: zm.string(), name: zm.string() });

    it('validates valid paginated response', () => {
      const schema = zodMiniSchema(paginationMini.response(itemSchema));
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
      const schema = zodMiniSchema(paginationMini.response(itemSchema));
      const result = schema.validate({ items: [], total: 0 });

      expect(result.success).toBe(true);
    });

    it('rejects invalid items', () => {
      const schema = zodMiniSchema(paginationMini.response(itemSchema));
      const result = schema.validate({
        items: [{ id: 123, name: 'Alice' }],
        total: 1,
      });

      expect(result.success).toBe(false);
    });

    it('rejects missing total', () => {
      const schema = zodMiniSchema(paginationMini.response(itemSchema));
      const result = schema.validate({ items: [] });

      expect(result.success).toBe(false);
    });
  });

  describe('JSON Schema', () => {
    it('input generates JSON Schema with defaults', () => {
      const schema = zodMiniSchema(paginationMini.input);
      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
      expect(props.page.default).toBe(1);
      expect(props.pageSize.default).toBe(10);
    });

    it('response generates JSON Schema with items array', () => {
      const itemSchema = zm.object({ id: zm.string() });
      const schema = zodMiniSchema(paginationMini.response(itemSchema));
      const jsonSchema = schema.toJsonSchema();

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      const props = jsonSchema.properties as Record<string, Record<string, unknown>>;
      expect(props.items.type).toBe('array');
    });
  });
});
