/**
 * @fileoverview Zod schema adapter for the unified route system.
 *
 * This adapter wraps Zod schemas to provide a consistent interface
 * for validation and JSON Schema generation. Uses Zod v4's native
 * `z.toJSONSchema()` for JSON Schema conversion.
 *
 * @module unified/schema/adapters/zod
 */

import { z, type ZodType } from 'zod';
import type { JsonSchema } from '../types/json-schema.type';
import type { JsonSchemaOptions, SchemaAdapter } from '../types/schema-adapter.type';
import type { ValidationResult } from '../types/validation.type';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodAny = ZodType<any, any, any>;

/**
 * Creates a SchemaAdapter from a Zod schema.
 *
 * Uses Zod v4's native `z.toJSONSchema()` for comprehensive JSON Schema
 * conversion supporting all Zod types and features.
 *
 * @param schema - A Zod schema to wrap
 * @returns A SchemaAdapter that validates using Zod and generates JSON Schema
 *
 * @example Basic usage
 * ```typescript
 * import { z } from 'zod';
 * import { zodSchema } from '@cosmneo/onion-lasagna/unified/schema/zod';
 *
 * const userSchema = zodSchema(z.object({
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
 * const dateSchema = zodSchema(
 *   z.string().datetime().transform((s) => new Date(s))
 * );
 *
 * const result = dateSchema.validate('2024-01-15T10:30:00Z');
 * if (result.success) {
 *   console.log(result.data); // Date object
 * }
 * ```
 *
 * @example With descriptions for OpenAPI
 * ```typescript
 * const productSchema = zodSchema(z.object({
 *   id: z.string().uuid().describe('Unique product identifier'),
 *   name: z.string().min(1).max(200).describe('Product name'),
 *   price: z.number().positive().describe('Price in cents'),
 *   tags: z.array(z.string()).optional().describe('Product tags'),
 * }));
 *
 * // JSON Schema will include descriptions for OpenAPI documentation
 * ```
 */
export function zodSchema<T extends ZodAny>(
  schema: T,
): SchemaAdapter<T['_output'], T['_input']> {
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

    toJsonSchema(_options?: JsonSchemaOptions): JsonSchema {
      // Use Zod v4's native toJSONSchema for comprehensive conversion
      const result = z.toJSONSchema(schema, {
        // Use OpenAPI 3.0 target for direct OpenAPI spec compatibility
        target: 'openapi-3.0',
        // Inline all schemas for simpler integration (no $refs)
        reused: 'inline',
        // Return 'any' for unrepresentable types instead of throwing
        unrepresentable: 'any',
      });

      // Remove $schema to avoid conflicts with OpenAPI
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
      const { $schema, ...schemaWithoutMeta } = result as Record<string, unknown>;

      return schemaWithoutMeta as JsonSchema;
    },

    _output: undefined as TOutput,
    _input: undefined as TInput,
    _schema: schema,
  };
}

/**
 * Re-export zod types for convenience.
 * Users can import zod functionality from this module.
 */
export { z } from 'zod';
