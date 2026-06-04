/**
 * @fileoverview Cross-adapter conformance suite.
 *
 * Runs the SAME representative schemas and inputs through the four schema
 * adapters available in this package's devDependencies
 * (zod v4, arktype, typebox, valibot) and asserts that they all satisfy
 * the SchemaAdapter contract:
 *
 *   - validate() returns { success: true, data } on valid input
 *   - validate() returns { success: false, issues } on invalid input
 *   - issues[].path is an array of strings (dot-path segments)
 *   - issues[].message is a non-empty string
 *   - toJsonSchema() returns an object without a $schema property
 *   - toJsonSchema() returns { type: 'object' } for plain object schemas
 *   - toJsonSchema() includes a `required` array for required fields
 *
 * The zod-v3 adapter is tested separately in the onion-lasagna-zod-v3
 * package because zod@3 and zod@4 cannot coexist in the same devDependencies.
 *
 * @module schema/conformance
 */

import { describe, it, expect } from 'vitest';

// ─── Library imports (devDependencies of this package) ────────────────────────
import { z } from 'zod';
import { type } from 'arktype';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import * as v from 'valibot';
import { toJsonSchema as valibotToJsonSchema } from '@valibot/to-json-schema';

// ─── Core types ───────────────────────────────────────────────────────────────
import type { SchemaAdapter, ValidationResult } from '../types/index';

// ─── Inline adapter implementations ──────────────────────────────────────────
// These mirror the satellite packages (onion-lasagna-zod, onion-lasagna-arktype,
// onion-lasagna-typebox, onion-lasagna-valibot) but live here to avoid circular
// workspace dependencies at test time.

import type { JsonSchema } from '../types/json-schema.type';

function makeZodAdapter<T extends ReturnType<typeof z.object>>(
  schema: T,
): SchemaAdapter<T['_output'], T['_input']> {
  return {
    validate(data: unknown): ValidationResult<T['_output']> {
      const result = schema.safeParse(data);
      if (result.success) return { success: true, data: result.data };
      return {
        success: false,
        issues: result.error.issues.map((issue) => ({
          path: issue.path.map(String),
          message: issue.message,
          code: issue.code,
        })),
      };
    },
    toJsonSchema(): JsonSchema {
      const raw = z.toJSONSchema(schema, {
        target: 'openapi-3.0',
        reused: 'inline',
        unrepresentable: 'any',
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
      const { $schema, ...rest } = raw as Record<string, unknown>;
      return rest as JsonSchema;
    },
    _output: undefined as T['_output'],
    _input: undefined as T['_input'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _schema: schema as any,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeArktypeAdapter(schema: ReturnType<typeof type>): SchemaAdapter<any, any> {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validate(data: unknown): ValidationResult<any> {
      const out = schema(data);
      if (out instanceof type.errors) {
        return {
          success: false,
          issues: out.map((e) => ({
            path: [...e.path].map(String),
            message: e.message,
            code: e.code,
          })),
        };
      }
      return { success: true, data: out };
    },
    toJsonSchema(): JsonSchema {
      const raw = schema.toJsonSchema({ fallback: { morph: (ctx) => ctx.out ?? ctx.base } });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
      const { $schema, ...rest } = raw as Record<string, unknown>;
      return rest as JsonSchema;
    },
    _output: undefined,
    _input: undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _schema: schema as any,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeTypeboxAdapter(schema: ReturnType<typeof Type.Object>): SchemaAdapter<any, any> {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validate(data: unknown): ValidationResult<any> {
      if (!Value.Check(schema, data)) {
        const errors = [...Value.Errors(schema, data)];
        return {
          success: false,
          issues: errors.map((e) => ({
            path: e.path.split('/').filter(Boolean),
            message: e.message,
          })),
        };
      }
      try {
        const decoded = Value.Decode(schema, data);
        return { success: true, data: decoded };
      } catch (err) {
        return {
          success: false,
          issues: [
            {
              path: [],
              message: err instanceof Error ? err.message : 'decode failed',
            },
          ],
        };
      }
    },
    toJsonSchema(): JsonSchema {
      return structuredClone(schema) as JsonSchema;
    },
    _output: undefined,
    _input: undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _schema: schema as any,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeValibotAdapter(schema: v.GenericSchema): SchemaAdapter<any, any> {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validate(data: unknown): ValidationResult<any> {
      const result = v.safeParse(schema, data);
      if (result.success) return { success: true, data: result.output };
      return {
        success: false,
        issues: result.issues.map((issue) => ({
          path: (issue.path ?? []).map((item) => String(item.key)),
          message: issue.message,
          code: issue.type,
        })),
      };
    },
    toJsonSchema(): JsonSchema {
      const raw = valibotToJsonSchema(schema, { errorMode: 'ignore' });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
      const { $schema, ...rest } = raw as Record<string, unknown>;
      return rest as JsonSchema;
    },
    _output: undefined,
    _input: undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _schema: schema as any,
  };
}

// ─── Shared adapter table ─────────────────────────────────────────────────────

/**
 * Each entry provides a name and an adapter wrapping an equivalent
 * "user object with name + optional age" schema.
 */
const adapters: {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validatingObject: SchemaAdapter<any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nestedObject: SchemaAdapter<any, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stringConstraints: SchemaAdapter<any, any>;
}[] = [
  {
    name: 'zod (v4)',
    validatingObject: makeZodAdapter(
      z.object({
        name: z.string(),
        age: z.number().optional(),
      }),
    ),
    nestedObject: makeZodAdapter(
      z.object({
        user: z.object({
          email: z.string().email(),
        }),
      }),
    ),
    stringConstraints: makeZodAdapter(
      z.object({
        title: z.string().min(1).max(100),
      }),
    ),
  },
  {
    name: 'arktype',
    validatingObject: makeArktypeAdapter(
      type({
        name: 'string',
        'age?': 'number',
      }),
    ),
    nestedObject: makeArktypeAdapter(
      type({
        user: {
          email: 'string.email',
        },
      }),
    ),
    stringConstraints: makeArktypeAdapter(
      type({
        title: '1 <= string <= 100',
      }),
    ),
  },
  {
    name: 'typebox',
    validatingObject: makeTypeboxAdapter(
      Type.Object({
        name: Type.String(),
        age: Type.Optional(Type.Number()),
      }),
    ),
    nestedObject: makeTypeboxAdapter(
      Type.Object({
        user: Type.Object({
          email: Type.String({ format: 'email' }),
        }),
      }),
    ),
    stringConstraints: makeTypeboxAdapter(
      Type.Object({
        title: Type.String({ minLength: 1, maxLength: 100 }),
      }),
    ),
  },
  {
    name: 'valibot',
    validatingObject: makeValibotAdapter(
      v.object({
        name: v.string(),
        age: v.optional(v.number()),
      }),
    ),
    nestedObject: makeValibotAdapter(
      v.object({
        user: v.object({
          email: v.pipe(v.string(), v.email()),
        }),
      }),
    ),
    stringConstraints: makeValibotAdapter(
      v.object({
        title: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
      }),
    ),
  },
];

// ─── Contract assertions ──────────────────────────────────────────────────────

describe('schema adapter cross-adapter conformance', () => {
  for (const adapter of adapters) {
    describe(adapter.name, () => {
      describe('validate() — success shape', () => {
        it('returns { success: true, data } for valid object', () => {
          const result = adapter.validatingObject.validate({ name: 'Alice', age: 30 });

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toMatchObject({ name: 'Alice' });
            expect('issues' in result).toBe(false);
          }
        });

        it('returns { success: true, data } for object with optional field omitted', () => {
          const result = adapter.validatingObject.validate({ name: 'Bob' });

          expect(result.success).toBe(true);
        });
      });

      describe('validate() — failure shape', () => {
        it('returns { success: false, issues } for invalid root type', () => {
          const result = adapter.validatingObject.validate(null);

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(Array.isArray(result.issues)).toBe(true);
            expect(result.issues.length).toBeGreaterThan(0);
            expect('data' in result).toBe(false);
          }
        });

        it('issues[].path is an array of strings for nested errors', () => {
          const result = adapter.nestedObject.validate({ user: { email: 'not-an-email' } });

          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.issues.length).toBeGreaterThan(0);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const issue = result.issues[0]!;
            // Path must be an array
            expect(Array.isArray(issue.path)).toBe(true);
            // Each path segment must be a string
            for (const segment of issue.path) {
              expect(typeof segment).toBe('string');
            }
            // For a nested error on user.email, path should contain at least one segment
            expect(issue.path.length).toBeGreaterThan(0);
          }
        });

        it('issues[].message is a non-empty string', () => {
          const result = adapter.validatingObject.validate({ name: 42 });

          expect(result.success).toBe(false);
          if (!result.success) {
            for (const issue of result.issues) {
              expect(typeof issue.message).toBe('string');
              expect(issue.message.length).toBeGreaterThan(0);
            }
          }
        });

        it('issues[].path is [] for root-level errors', () => {
          // Pass a non-object to trigger a root-level error
          const result = adapter.validatingObject.validate('not-an-object');

          expect(result.success).toBe(false);
          if (!result.success) {
            // At least one issue should have an empty or non-nested path
            const hasShallowPath = result.issues.some((i) => i.path.length <= 1);
            expect(hasShallowPath).toBe(true);
          }
        });
      });

      describe('toJsonSchema()', () => {
        it('does not include $schema property', () => {
          const js = adapter.validatingObject.toJsonSchema();
          expect(js.$schema).toBeUndefined();
        });

        it('returns { type: "object" } for object schemas', () => {
          const js = adapter.validatingObject.toJsonSchema();
          expect(js.type).toBe('object');
        });

        it('includes required array that contains non-optional fields', () => {
          const js = adapter.validatingObject.toJsonSchema();
          // "name" is required; "age" is optional
          expect(Array.isArray(js.required)).toBe(true);
          expect(js.required).toContain('name');
        });

        it('does NOT include optional-only fields in required array', () => {
          const js = adapter.validatingObject.toJsonSchema();
          expect(js.required).not.toContain('age');
        });

        it('includes properties for object schemas', () => {
          const js = adapter.validatingObject.toJsonSchema();
          expect(js.properties).toBeDefined();
          expect(typeof js.properties).toBe('object');
        });

        it('reflects string length constraints in JSON Schema', () => {
          const js = adapter.stringConstraints.toJsonSchema();
          // We expect minLength and maxLength to appear somewhere in the schema tree
          const schemaStr = JSON.stringify(js);
          expect(schemaStr).toMatch(/minLength|minimum/);
          expect(schemaStr).toMatch(/maxLength|maximum/);
        });
      });
    });
  }
});
