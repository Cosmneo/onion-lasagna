/**
 * @fileoverview Conformance test for the zodV3Schema adapter.
 *
 * Asserts that zodV3Schema satisfies the same SchemaAdapter contract as
 * the other adapters tested in the core package's adapter-conformance suite:
 *
 *   - validate() success/failure shape
 *   - issues[].path is an array of strings
 *   - issues[].message is a non-empty string
 *   - toJsonSchema() without $schema
 *   - toJsonSchema() with type: 'object'
 *   - toJsonSchema() with correct required/optional fields
 *   - toJsonSchema() reflects string length constraints
 *
 * NOTE: zod-v3 is tested in a separate package (not alongside the other adapters
 * in the core's adapter-conformance.test.ts) because zod@3 and zod@4 cannot
 * coexist as devDependencies in the same package under a single 'zod' key.
 *
 * @module zod-v3/conformance
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodV3Schema } from '../zod-v3.adapter';

// ─── Shared adapter under test ────────────────────────────────────────────────

const validatingObject = zodV3Schema(
  z.object({
    name: z.string(),
    age: z.number().optional(),
  }),
);

const nestedObject = zodV3Schema(
  z.object({
    user: z.object({
      email: z.string().email(),
    }),
  }),
);

const stringConstraints = zodV3Schema(
  z.object({
    title: z.string().min(1).max(100),
  }),
);

// ─── Contract assertions ──────────────────────────────────────────────────────

describe('zodV3Schema — SchemaAdapter contract conformance', () => {
  describe('validate() — success shape', () => {
    it('returns { success: true, data } for valid object', () => {
      const result = validatingObject.validate({ name: 'Alice', age: 30 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({ name: 'Alice' });
        expect('issues' in result).toBe(false);
      }
    });

    it('returns { success: true, data } for object with optional field omitted', () => {
      const result = validatingObject.validate({ name: 'Bob' });

      expect(result.success).toBe(true);
    });
  });

  describe('validate() — failure shape', () => {
    it('returns { success: false, issues } for invalid root type', () => {
      const result = validatingObject.validate(null);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Array.isArray(result.issues)).toBe(true);
        expect(result.issues.length).toBeGreaterThan(0);
        expect('data' in result).toBe(false);
      }
    });

    it('issues[].path is an array of strings for nested errors', () => {
      const result = nestedObject.validate({ user: { email: 'not-an-email' } });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0);
        const issue = result.issues[0]!;
        expect(Array.isArray(issue.path)).toBe(true);
        for (const segment of issue.path) {
          expect(typeof segment).toBe('string');
        }
        expect(issue.path.length).toBeGreaterThan(0);
      }
    });

    it('issues[].message is a non-empty string', () => {
      const result = validatingObject.validate({ name: 42 });

      expect(result.success).toBe(false);
      if (!result.success) {
        for (const issue of result.issues) {
          expect(typeof issue.message).toBe('string');
          expect(issue.message.length).toBeGreaterThan(0);
        }
      }
    });

    it('issues[].path is [] or shallow for root-level errors', () => {
      const result = validatingObject.validate('not-an-object');

      expect(result.success).toBe(false);
      if (!result.success) {
        const hasShallowPath = result.issues.some((i) => i.path.length <= 1);
        expect(hasShallowPath).toBe(true);
      }
    });
  });

  describe('toJsonSchema()', () => {
    it('does not include $schema property', () => {
      const js = validatingObject.toJsonSchema();
      expect(js.$schema).toBeUndefined();
    });

    it('returns { type: "object" } for object schemas', () => {
      const js = validatingObject.toJsonSchema();
      expect(js.type).toBe('object');
    });

    it('includes required array that contains non-optional fields', () => {
      const js = validatingObject.toJsonSchema();
      expect(Array.isArray(js.required)).toBe(true);
      expect(js.required).toContain('name');
    });

    it('does NOT include optional-only fields in required array', () => {
      const js = validatingObject.toJsonSchema();
      expect(js.required).not.toContain('age');
    });

    it('includes properties for object schemas', () => {
      const js = validatingObject.toJsonSchema();
      expect(js.properties).toBeDefined();
      expect(typeof js.properties).toBe('object');
    });

    it('reflects string length constraints in JSON Schema', () => {
      const js = stringConstraints.toJsonSchema();
      const schemaStr = JSON.stringify(js);
      expect(schemaStr).toMatch(/minLength|minimum/);
      expect(schemaStr).toMatch(/maxLength|maximum/);
    });
  });
});
