/**
 * @fileoverview Schema adapter interface for validation library abstraction.
 *
 * The SchemaAdapter interface provides a unified API for working with
 * different validation libraries (Zod, TypeBox, Valibot, ArkType).
 * Each adapter wraps a library-specific schema and provides:
 * - Runtime validation
 * - JSON Schema conversion for OpenAPI
 * - TypeScript type inference via phantom types
 *
 * @module unified/schema/types/schema-adapter
 */

import type { JsonSchema } from './json-schema.type';
import type { ValidationResult } from './validation.type';

/**
 * Schema adapter interface that abstracts validation library specifics.
 *
 * This interface is the core abstraction that enables the unified route
 * system to work with any validation library. Implementations wrap a
 * library-specific schema (Zod, TypeBox, etc.) and provide a consistent API.
 *
 * @typeParam TOutput - The TypeScript type of successfully validated data.
 *                      For schemas with transforms, this is the output type.
 * @typeParam TInput - The TypeScript type expected as input (before transforms).
 *                     Defaults to TOutput for schemas without transforms.
 *
 * @example Creating an adapter (using Zod)
 * ```typescript
 * import { z } from 'zod';
 * import { zodSchema } from '@cosmneo/onion-lasagna/unified/schema/zod';
 *
 * const userSchema = zodSchema(z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 * }));
 *
 * // Validate data
 * const result = userSchema.validate(input);
 * if (result.success) {
 *   // result.data is typed as { name: string; email: string }
 * }
 *
 * // Get JSON Schema for OpenAPI
 * const jsonSchema = userSchema.toJsonSchema();
 * ```
 */
export interface SchemaAdapter<TOutput = unknown, TInput = TOutput> {
  /**
   * Validates unknown data against the schema.
   *
   * This method performs full validation including:
   * - Type checking
   * - Constraint validation (min/max, patterns, etc.)
   * - Nested object/array validation
   * - Custom validations defined in the schema
   *
   * For schemas with transforms, the returned data will be the transformed value.
   *
   * @param data - Unknown data to validate
   * @returns Validation result with typed data on success or issues on failure
   *
   * @example
   * ```typescript
   * const result = schema.validate({ name: 'John', age: 25 });
   * if (result.success) {
   *   console.log(result.data.name); // TypeScript knows this is a string
   * } else {
   *   console.log(result.issues); // Array of validation errors
   * }
   * ```
   */
  validate(data: unknown): ValidationResult<TOutput>;

  /**
   * Converts the schema to JSON Schema format for OpenAPI generation.
   *
   * The returned schema should be compatible with JSON Schema Draft 7
   * and OpenAPI 3.0/3.1 specifications. Complex schemas with transforms
   * or refinements may produce simplified JSON Schema representations.
   *
   * @param options - Optional configuration for schema generation
   * @returns JSON Schema representation of this schema
   *
   * @example
   * ```typescript
   * const jsonSchema = schema.toJsonSchema();
   * // {
   * //   type: 'object',
   * //   properties: {
   * //     name: { type: 'string', minLength: 1 },
   * //     email: { type: 'string', format: 'email' }
   * //   },
   * //   required: ['name', 'email']
   * // }
   * ```
   */
  toJsonSchema(options?: JsonSchemaOptions): JsonSchema;

  /**
   * Phantom type marker for output type inference.
   * This property is never accessed at runtime - it exists only for TypeScript.
   *
   * @internal
   */
  readonly _output: TOutput;

  /**
   * Phantom type marker for input type inference.
   * This property is never accessed at runtime - it exists only for TypeScript.
   * Useful for schemas with transforms where input and output types differ.
   *
   * @internal
   */
  readonly _input: TInput;

  /**
   * Optional: Reference to the underlying schema for advanced use cases.
   * The type depends on the validation library being used.
   *
   * @internal
   */
  readonly _schema?: unknown;
}

/**
 * Options for JSON Schema generation.
 */
export interface JsonSchemaOptions {
  /**
   * Strategy for handling $ref references.
   * - 'none': Inline all schemas, no $refs
   * - 'root': Create $refs only at the root level
   * - 'all': Use $refs wherever possible (most compact)
   *
   * @default 'none'
   */
  readonly refStrategy?: 'none' | 'root' | 'all';

  /**
   * Base path for $ref references.
   * @default '#/$defs/'
   */
  readonly basePath?: string;

  /**
   * Custom definitions to include in the schema.
   */
  readonly definitions?: Record<string, JsonSchema>;

  /**
   * Whether to include schema metadata (title, description, etc.).
   * @default true
   */
  readonly includeMetadata?: boolean;
}

/**
 * Infers the output type from a SchemaAdapter.
 *
 * @example
 * ```typescript
 * const userSchema = zodSchema(z.object({ name: z.string() }));
 * type User = InferOutput<typeof userSchema>;
 * // { name: string }
 * ```
 */
export type InferOutput<T extends SchemaAdapter<unknown, unknown>> =
  T extends SchemaAdapter<infer O, unknown> ? O : never;

/**
 * Infers the input type from a SchemaAdapter.
 * For schemas without transforms, this is the same as InferOutput.
 *
 * @example
 * ```typescript
 * const dateSchema = zodSchema(z.string().transform(s => new Date(s)));
 * type DateInput = InferInput<typeof dateSchema>;
 * // string (the input before transform)
 * type DateOutput = InferOutput<typeof dateSchema>;
 * // Date (the output after transform)
 * ```
 */
export type InferInput<T extends SchemaAdapter<unknown, unknown>> =
  T extends SchemaAdapter<unknown, infer I> ? I : never;

/**
 * Type guard to check if a value is a SchemaAdapter.
 */
export function isSchemaAdapter(value: unknown): value is SchemaAdapter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'validate' in value &&
    typeof (value as SchemaAdapter).validate === 'function' &&
    'toJsonSchema' in value &&
    typeof (value as SchemaAdapter).toJsonSchema === 'function'
  );
}

/**
 * Creates a schema adapter that always passes validation.
 * Useful for routes that accept any input.
 *
 * @example
 * ```typescript
 * const anySchema = createPassthroughAdapter<unknown>();
 * anySchema.validate(anything); // always succeeds
 * ```
 */
export function createPassthroughAdapter<T = unknown>(): SchemaAdapter<T, T> {
  return {
    validate: (data) => ({ success: true, data: data as T }),
    toJsonSchema: () => ({}),
    _output: undefined as T,
    _input: undefined as T,
  };
}

/**
 * Creates a schema adapter that always fails validation with a message.
 * Useful for deprecating routes or marking them as not accepting input.
 *
 * @example
 * ```typescript
 * const noBodySchema = createRejectingAdapter('This endpoint does not accept a request body');
 * ```
 */
export function createRejectingAdapter<T = never>(
  message: string,
): SchemaAdapter<T, T> {
  return {
    validate: () => ({
      success: false,
      issues: [{ path: [], message }],
    }),
    toJsonSchema: () => ({ not: {} }),
    _output: undefined as T,
    _input: undefined as T,
  };
}
