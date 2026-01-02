/**
 * @fileoverview TypeBox schema adapter for the unified route system.
 *
 * TypeBox is unique among validation libraries because its schemas ARE
 * JSON Schema. This makes it ideal for OpenAPI generation with zero
 * conversion overhead.
 *
 * @module unified/schema/adapters/typebox
 */

import type { Static, TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import type { JsonSchema } from '../types/json-schema.type';
import type { JsonSchemaOptions, SchemaAdapter } from '../types/schema-adapter.type';
import type { ValidationResult } from '../types/validation.type';

/**
 * Safely stringifies a value for error reporting.
 * Returns undefined if stringification fails (e.g., circular references, BigInt).
 */
function safeStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    // Handle circular references, BigInt, or other non-serializable values
    if (typeof value === 'object' && value !== null) {
      return '[Complex Object]';
    }
    if (typeof value === 'bigint') {
      return String(value);
    }
    return String(value);
  }
}

/**
 * Creates a SchemaAdapter from a TypeBox schema.
 *
 * TypeBox schemas are JSON Schema, so `toJsonSchema()` simply returns
 * the schema itself (with optional cleanup). This makes TypeBox the most
 * efficient choice when OpenAPI generation is a priority.
 *
 * @typeParam T - A TypeBox schema type
 *
 * @param schema - A TypeBox schema to wrap
 * @returns A SchemaAdapter that validates using TypeBox and returns the schema as JSON Schema
 *
 * @example Basic usage
 * ```typescript
 * import { Type } from '@sinclair/typebox';
 * import { typeboxSchema } from '@cosmneo/onion-lasagna/unified/schema/typebox';
 *
 * const userSchema = typeboxSchema(Type.Object({
 *   name: Type.String({ minLength: 1, maxLength: 100 }),
 *   email: Type.String({ format: 'email' }),
 *   age: Type.Optional(Type.Integer({ minimum: 0, maximum: 150 })),
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
 * // Get JSON Schema (this IS the TypeBox schema!)
 * const jsonSchema = userSchema.toJsonSchema();
 * ```
 *
 * @example Complex types
 * ```typescript
 * const orderSchema = typeboxSchema(Type.Object({
 *   id: Type.String({ format: 'uuid' }),
 *   items: Type.Array(Type.Object({
 *     productId: Type.String(),
 *     quantity: Type.Integer({ minimum: 1 }),
 *     price: Type.Number({ minimum: 0 }),
 *   })),
 *   status: Type.Union([
 *     Type.Literal('pending'),
 *     Type.Literal('processing'),
 *     Type.Literal('shipped'),
 *     Type.Literal('delivered'),
 *   ]),
 *   createdAt: Type.String({ format: 'date-time' }),
 * }));
 * ```
 */
export function typeboxSchema<T extends TSchema>(schema: T): SchemaAdapter<Static<T>, Static<T>> {
  return {
    validate(data: unknown): ValidationResult<Static<T>> {
      // Check if data matches the schema
      const isValid = Value.Check(schema, data);

      if (isValid) {
        // Cast the data - TypeBox validates and we know it matches
        return { success: true, data: data as Static<T> };
      }

      // Collect all validation errors
      const errors = [...Value.Errors(schema, data)];

      return {
        success: false,
        issues: errors.map((error) => ({
          // TypeBox paths are like '/property/nested' - convert to array
          path: error.path.split('/').filter(Boolean),
          message: error.message,
          code: error.type ? String(error.type) : undefined,
          // Use safeStringify to handle circular references and non-serializable values
          expected: error.schema ? safeStringify(error.schema) : undefined,
          received: error.value !== undefined ? safeStringify(error.value) : undefined,
        })),
      };
    },

    toJsonSchema(_options?: JsonSchemaOptions): JsonSchema {
      // TypeBox schemas ARE JSON Schema - just return it
      // We create a shallow copy to prevent mutation
      return { ...schema } as JsonSchema;
    },

    _output: undefined as Static<T>,
    _input: undefined as Static<T>,
    _schema: schema,
  };
}

/**
 * Re-export TypeBox Type for convenience.
 * Users can import TypeBox functionality from this module.
 */
export { Type } from '@sinclair/typebox';
