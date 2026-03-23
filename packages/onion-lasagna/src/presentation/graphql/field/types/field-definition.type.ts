/**
 * @fileoverview Core GraphQL field definition types.
 *
 * A field definition captures all information needed for:
 * - Type-safe resolver generation
 * - Server-side schema registration with automatic validation
 * - SDL generation (deferred)
 *
 * @module graphql/field/types/field-definition
 */

import type { SchemaAdapter } from '../../../http/schema/types';

// ============================================================================
// Operation Types
// ============================================================================

/**
 * GraphQL operation type.
 */
export type GraphQLOperationType = 'query' | 'mutation' | 'subscription';

// ============================================================================
// Documentation Types
// ============================================================================

/**
 * GraphQL field documentation for SDL generation.
 */
export interface GraphQLFieldDocumentation {
  /** Short summary of the field. */
  readonly summary?: string;

  /** Detailed description. Supports Markdown. */
  readonly description?: string;

  /** Tags for grouping fields. */
  readonly tags?: readonly string[];

  /** Whether this field is deprecated. @default false */
  readonly deprecated?: boolean;

  /** Deprecation reason (shown in SDL). */
  readonly deprecationReason?: string;
}

// ============================================================================
// Field Definition
// ============================================================================

/**
 * A fully defined GraphQL field with computed types.
 * This is the output of `defineQuery()` / `defineMutation()`.
 */
export interface GraphQLFieldDefinition<
  TOperation extends GraphQLOperationType = GraphQLOperationType,
  TInput = undefined,
  TOutput = undefined,
  TContext = undefined,
> {
  /** GraphQL operation type ('query' or 'mutation'). */
  readonly operation: TOperation;

  /** Input arguments validation schema. */
  readonly input: SchemaAdapter | undefined;

  /** Output type validation schema. */
  readonly output: SchemaAdapter | undefined;

  /** Context validation schema. */
  readonly context: SchemaAdapter | undefined;

  /** Field documentation. */
  readonly docs: GraphQLFieldDocumentation;

  /**
   * Marker to identify this as a GraphQL field definition.
   * @internal
   */
  readonly _isGraphQLField: true;

  /**
   * Phantom types for TypeScript inference.
   * Never accessed at runtime.
   * @internal
   */
  readonly _types: {
    readonly operation: TOperation;
    readonly input: TInput;
    readonly output: TOutput;
    readonly context: TContext;
  };
}

// ============================================================================
// Type Helpers
// ============================================================================

/** Infers the operation type from a field definition. */
export type InferFieldOperation<T> =
  T extends GraphQLFieldDefinition<infer TOperation, unknown, unknown, unknown>
    ? TOperation
    : never;

/** Infers the input type from a field definition. */
export type InferFieldInput<T> =
  T extends GraphQLFieldDefinition<GraphQLOperationType, infer TInput, unknown, unknown>
    ? TInput
    : never;

/** Infers the output type from a field definition. */
export type InferFieldOutput<T> =
  T extends GraphQLFieldDefinition<GraphQLOperationType, unknown, infer TOutput, unknown>
    ? TOutput
    : never;

/** Infers the context type from a field definition. */
export type InferFieldContext<T> =
  T extends GraphQLFieldDefinition<GraphQLOperationType, unknown, unknown, infer TContext>
    ? TContext
    : never;
