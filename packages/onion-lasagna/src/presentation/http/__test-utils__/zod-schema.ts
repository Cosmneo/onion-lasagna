/**
 * @fileoverview Test-only Zod schema adapter.
 *
 * This is a local copy of the zodSchema function used exclusively for testing
 * the core package without creating a circular dependency on @cosmneo/onion-lasagna-zod.
 */

import { z, type ZodType } from 'zod';
import type { JsonSchema } from '../schema/types/json-schema.type';
import type { JsonSchemaOptions, SchemaAdapter } from '../schema/types/schema-adapter.type';
import type { ValidationResult } from '../schema/types/validation.type';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodAny = ZodType<any, any, any>;

export function zodSchema<T extends ZodAny>(schema: T): SchemaAdapter<T['_output'], T['_input']> {
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
      const result = z.toJSONSchema(schema, {
        target: 'openapi-3.0',
        reused: 'inline',
        unrepresentable: 'any',
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
      const { $schema, ...schemaWithoutMeta } = result as Record<string, unknown>;

      return schemaWithoutMeta as JsonSchema;
    },

    _output: undefined as TOutput,
    _input: undefined as TInput,
    _schema: schema,
  };
}
