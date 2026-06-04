/**
 * @fileoverview ArkType schema adapter for the unified route system.
 *
 * This adapter wraps ArkType schemas to provide a consistent interface
 * for validation and JSON Schema generation. Uses ArkType's built-in
 * `.toJsonSchema()` for JSON Schema conversion.
 *
 * ArkType offers the fastest runtime validation among TypeScript schema
 * libraries (~20x faster than Zod) with a concise string-based DSL
 * and built-in type inference.
 *
 * @module unified/schema/adapters/arktype
 */

import { type, Type } from 'arktype';
import type {
  JsonSchema,
  JsonSchemaOptions,
  SchemaAdapter,
  ValidationResult,
} from '@cosmneo/onion-lasagna/http/schema/types';

/**
 * Creates a SchemaAdapter from an ArkType schema.
 *
 * Wraps an ArkType `Type` to provide validation via direct invocation
 * and JSON Schema generation via the built-in `.toJsonSchema()` method.
 * ArkType's string-based DSL enables concise schema definitions with
 * best-in-class runtime performance.
 *
 * ## JSON Schema / transform (morph) behaviour
 *
 * ArkType uses the term "morph" for its transform/coerce operations. When
 * generating JSON Schema, morphs are handled as follows:
 *
 * - **Typed `.to()` pipe** (e.g. `type('string').pipe(type('number'))`):
 *   The **output** schema is used, since the output type is known and
 *   representable in JSON Schema.
 * - **Untyped / function morphs** (e.g. `type('string').pipe(s => Number(s))`):
 *   The morph is not representable. The fallback strategy returns
 *   `ctx.out ?? ctx.base` — the output schema if available, otherwise the
 *   input schema.
 *
 * In practice this means `toJsonSchema()` tends to reflect the **output
 * shape** for typed morphs and the **input (wire) shape** for untyped
 * function morphs — the opposite of the zod-v3 adapter.
 *
 * @param schema - An ArkType schema to wrap
 * @returns A SchemaAdapter that validates using ArkType and generates JSON Schema
 *
 * @example Basic usage
 * ```typescript
 * import { type } from 'arktype';
 * import { arktypeSchema } from '@cosmneo/onion-lasagna-arktype';
 *
 * const userSchema = arktypeSchema(type({
 *   name: '1 <= string <= 100',
 *   email: 'string.email',
 *   'age?': '0 <= integer <= 150',
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
export function arktypeSchema<T extends Type>(schema: T): SchemaAdapter<T['infer'], T['inferIn']> {
  type TOutput = T['infer'];
  type TInput = T['inferIn'];

  return {
    validate(data: unknown): ValidationResult<TOutput> {
      const out = schema(data);

      if (out instanceof type.errors) {
        return {
          success: false,
          issues: out.map((error) => ({
            path: [...error.path].map(String),
            message: error.message,
            code: error.code,
            expected: error.expected,
            received: error.actual,
          })),
        };
      }

      return { success: true, data: out as TOutput };
    },

    toJsonSchema(options?: JsonSchemaOptions): JsonSchema {
      // NOTE: the `options` parameter (refStrategy, basePath, definitions,
      // includeMetadata) is accepted for interface compatibility but is not
      // yet honoured by this adapter.
      void options;

      const result = schema.toJsonSchema({
        // Morphs (e.g. string→number coercion via .pipe().to()) have no JSON Schema
        // equivalent. Use the output schema so OpenAPI documents the validated shape.
        // Falls back to the input schema if no typed output is available.
        fallback: { morph: (ctx) => ctx.out ?? ctx.base },
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
