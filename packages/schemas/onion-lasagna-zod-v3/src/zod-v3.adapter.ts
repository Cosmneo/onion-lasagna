/**
 * @fileoverview Zod v3 schema adapter for the unified route system.
 *
 * This adapter wraps Zod v3 schemas to provide a consistent interface
 * for validation and JSON Schema generation. Uses `zod-to-json-schema`
 * for JSON Schema conversion since Zod v3 has no built-in support.
 *
 * @module unified/schema/adapters/zod-v3
 */

import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type {
  JsonSchema,
  JsonSchemaOptions,
  SchemaAdapter,
  ValidationResult,
} from '@cosmneo/onion-lasagna/http/schema/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodAny = ZodType<any, any, any>;

/**
 * Creates a SchemaAdapter from a Zod v3 schema.
 *
 * Uses `zod-to-json-schema` for JSON Schema conversion, targeting
 * OpenAPI 3.0 compatibility with inlined definitions.
 *
 * ## JSON Schema / transform behaviour
 *
 * `zod-to-json-schema` is called with `effectStrategy: 'input'`, so
 * `toJsonSchema()` always returns the **input (wire) shape** for schemas that
 * include `.transform()`. For example, a `z.string().transform(s => new Date(s))`
 * schema produces `{ type: 'string' }` — the Date output type is not reflected.
 * This is consistent with documenting what the HTTP client must send.
 *
 * Note: Zod v4 (native `z.toJSONSchema()`) behaves differently — it emits `{}`
 * (an unconstrained schema) for transformed types because the transform output
 * is unrepresentable. The input-shape behaviour here is specific to zod-v3 +
 * `zod-to-json-schema`.
 *
 * @param schema - A Zod v3 schema to wrap
 * @returns A SchemaAdapter that validates using Zod and generates JSON Schema
 *
 * @example Basic usage
 * ```typescript
 * import { z } from 'zod';
 * import { zodV3Schema } from '@cosmneo/onion-lasagna-zod-v3';
 *
 * const userSchema = zodV3Schema(z.object({
 *   name: z.string().min(1).max(100),
 *   email: z.string().email(),
 *   age: z.number().int().min(0).max(150).optional(),
 * }));
 *
 * // Validate data
 * const result = userSchema.validate({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 * });
 *
 * if (result.success) {
 *   console.log(result.data); // { name: 'John Doe', email: 'john@example.com' }
 * }
 *
 * // Generate JSON Schema
 * const jsonSchema = userSchema.toJsonSchema();
 * // { type: 'object', properties: { ... }, required: ['name', 'email'] }
 * ```
 *
 * @example With transforms
 * ```typescript
 * const dateSchema = zodV3Schema(
 *   z.string().datetime().transform((s) => new Date(s))
 * );
 *
 * const result = dateSchema.validate('2024-01-15T10:30:00Z');
 * if (result.success) {
 *   console.log(result.data); // Date object
 * }
 * ```
 */
export function zodV3Schema<T extends ZodAny>(schema: T): SchemaAdapter<T['_output'], T['_input']> {
  type TOutput = T['_output'];
  type TInput = T['_input'];

  return {
    validate(data: unknown): ValidationResult<TOutput> {
      const result = schema.safeParse(data);

      if (result.success) {
        return { success: true, data: result.data as TOutput };
      }

      return {
        success: false,
        issues: result.error.issues.map((issue) => ({
          path: issue.path.map(String),
          message: issue.message,
          code: issue.code,
          expected: 'expected' in issue ? String(issue.expected) : undefined,
          received: 'received' in issue ? String(issue.received) : undefined,
        })),
      };
    },

    toJsonSchema(options?: JsonSchemaOptions): JsonSchema {
      // NOTE: the `options` parameter (refStrategy, basePath, definitions,
      // includeMetadata) is accepted for interface compatibility but is not
      // yet honoured by this adapter.
      void options;

      const result = zodToJsonSchema(schema, {
        target: 'openApi3',
        $refStrategy: 'none',
        effectStrategy: 'input',
      });

      // Remove $schema to avoid conflicts with OpenAPI
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
      const { $schema, ...schemaWithoutMeta } = result as Record<string, unknown>;

      // zod-to-json-schema adds `additionalProperties: false` for z.object(),
      // reflecting the library author's intent to reject unknown keys.
      // However, Zod only *strips* extra keys during validation — it does not
      // reject them. Removing additionalProperties: false restores that
      // permissive semantics in the generated OpenAPI document, preventing
      // validators from rejecting valid requests that carry extra fields.
      //
      // Note: Zod v4 takes a different approach — its native toJSONSchema()
      // emits `additionalProperties: false` by default because Zod v4 objects
      // do reject unknown keys. The stripping here is intentionally specific
      // to the zod-v3 semantics.
      return stripAdditionalProperties(schemaWithoutMeta) as JsonSchema;
    },

    _output: undefined as TOutput,
    _input: undefined as TInput,
    _schema: schema,
  };
}

/**
 * Recursively removes `additionalProperties: false` from a JSON Schema tree.
 *
 * `zod-to-json-schema` emits `additionalProperties: false` for every `z.object()`,
 * because Zod objects strip unknown keys by default. However, the JSON Schema
 * semantic of `additionalProperties: false` is to *reject* unknown keys,
 * which is stricter than Zod's behavior. Removing it lets Zod handle
 * extra-key stripping during validation instead.
 */
function stripAdditionalProperties(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'additionalProperties' && value === false) {
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? stripAdditionalProperties(item as Record<string, unknown>)
          : item,
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = stripAdditionalProperties(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}
