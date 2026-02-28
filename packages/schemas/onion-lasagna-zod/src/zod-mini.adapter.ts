/**
 * @fileoverview Zod Mini schema adapter for the unified route system.
 *
 * This adapter wraps `zod/mini` schemas to provide a consistent interface
 * for validation and JSON Schema generation. Uses `zod/mini`'s `toJSONSchema()`
 * for JSON Schema conversion, with the same quality as the classic Zod adapter.
 *
 * Zod Mini offers a smaller bundle (~2.1 kB vs ~5.9 kB gzipped) with a
 * functional API, making it suitable for serverless and edge deployments.
 *
 * @module unified/schema/adapters/zod-mini
 */

import * as zm from 'zod/mini';
import type {
  JsonSchema,
  JsonSchemaOptions,
  SchemaAdapter,
  ValidationResult,
} from '@cosmneo/onion-lasagna/http/schema/types';

/**
 * Structural constraint for any `zod/mini` schema.
 *
 * `ZodMiniType` doesn't extend `ZodType`, so we use a structural type
 * that matches all mini schemas via the `_zod` internal property.
 */
interface ZodMiniSchema {
  safeParse(
    data: unknown,
  ): { success: true; data: unknown } | { success: false; error: ZodMiniError };
  readonly _zod: {
    readonly output: unknown;
    readonly input: unknown;
  };
}

interface ZodMiniError {
  readonly issues: readonly ZodMiniIssue[];
}

interface ZodMiniIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
  readonly code: string;
  readonly expected?: string;
  readonly received?: string;
}

/**
 * Extracts the output type from a `zod/mini` schema.
 */
type MiniOutput<T extends ZodMiniSchema> = T['_zod']['output'];

/**
 * Extracts the input type from a `zod/mini` schema.
 */
type MiniInput<T extends ZodMiniSchema> = T['_zod']['input'];

/**
 * Creates a SchemaAdapter from a `zod/mini` schema.
 *
 * Functionally identical to `zodSchema()` but accepts `zod/mini` schemas,
 * which provide a smaller bundle size for serverless and edge deployments.
 *
 * @param schema - A `zod/mini` schema to wrap
 * @returns A SchemaAdapter that validates using Zod Mini and generates JSON Schema
 *
 * @example Basic usage
 * ```typescript
 * import * as z from 'zod/mini';
 * import { zodMiniSchema } from '@cosmneo/onion-lasagna-zod';
 *
 * const userSchema = zodMiniSchema(z.object({
 *   name: z.string().check(z.minLength(1), z.maxLength(100)),
 *   email: z.string().check(z.email()),
 *   age: z.optional(z.number().check(z.int(), z.minimum(0), z.maximum(150))),
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
export function zodMiniSchema<T extends ZodMiniSchema>(
  schema: T,
): SchemaAdapter<MiniOutput<T>, MiniInput<T>> {
  type TOutput = MiniOutput<T>;
  type TInput = MiniInput<T>;

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
      const result = zm.toJSONSchema(schema as unknown as zm.ZodMiniType, {
        target: 'openapi-3.0',
        reused: 'inline',
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
