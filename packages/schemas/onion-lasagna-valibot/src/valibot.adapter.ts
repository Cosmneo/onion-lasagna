/**
 * @fileoverview Valibot schema adapter for the unified route system.
 *
 * This adapter wraps Valibot schemas to provide a consistent interface
 * for validation and JSON Schema generation. Uses `@valibot/to-json-schema`
 * for JSON Schema conversion.
 *
 * Valibot offers the smallest bundle size among TypeScript validation
 * libraries (~0.7-1.4 kB gzipped for typical usage) through its fully
 * tree-shakeable modular API, making it ideal for serverless and edge
 * deployments.
 *
 * @module unified/schema/adapters/valibot
 */

import * as v from 'valibot';
import type { GenericSchema } from 'valibot';
import { toJsonSchema } from '@valibot/to-json-schema';
import type {
  JsonSchema,
  JsonSchemaOptions,
  SchemaAdapter,
  ValidationResult,
} from '@cosmneo/onion-lasagna/http/schema/types';

/**
 * Creates a SchemaAdapter from a Valibot schema.
 *
 * Wraps a Valibot schema to provide validation via `v.safeParse()` and
 * JSON Schema generation via `@valibot/to-json-schema`. Valibot's modular
 * architecture ensures only the validators you use are included in the bundle.
 *
 * @param schema - A Valibot schema to wrap
 * @returns A SchemaAdapter that validates using Valibot and generates JSON Schema
 *
 * @example Basic usage
 * ```typescript
 * import * as v from 'valibot';
 * import { valibotSchema } from '@cosmneo/onion-lasagna-valibot';
 *
 * const userSchema = valibotSchema(v.object({
 *   name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
 *   email: v.pipe(v.string(), v.email()),
 *   age: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(150))),
 * }));
 *
 * // Validate data
 * const result = userSchema.validate({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 * });
 *
 * // Generate JSON Schema
 * const jsonSchema = userSchema.toJsonSchema();
 * ```
 */
export function valibotSchema<T extends GenericSchema>(
  schema: T,
): SchemaAdapter<v.InferOutput<T>, v.InferInput<T>> {
  type TOutput = v.InferOutput<T>;
  type TInput = v.InferInput<T>;

  return {
    validate(data: unknown): ValidationResult<TOutput> {
      const result = v.safeParse(schema, data);

      if (result.success) {
        return { success: true, data: result.output as TOutput };
      }

      return {
        success: false,
        issues: result.issues.map((issue) => ({
          path: (issue.path ?? []).map((item) => String(item.key)),
          message: issue.message,
          code: issue.type,
          expected: issue.expected ?? undefined,
          received: issue.received,
        })),
      };
    },

    toJsonSchema(_options?: JsonSchemaOptions): JsonSchema {
      const result = toJsonSchema(schema, {
        errorMode: 'ignore',
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
