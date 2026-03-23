/**
 * @fileoverview Factory functions for creating GraphQL field definitions.
 *
 * `defineQuery`, `defineMutation`, and `defineSubscription` are the main entry
 * points for defining GraphQL fields. They mirror `defineRoute` /
 * `defineEventHandler` from the HTTP and event layers.
 *
 * @module graphql/field/define-field
 */

import type { SchemaAdapter, InferOutput } from '../../http/schema/types';
import type { GraphQLFieldDefinition, GraphQLOperationType } from './types';

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for defineQuery / defineMutation.
 *
 * @example Query with input and output
 * ```typescript
 * defineQuery({
 *   input: zodSchema(z.object({ userId: z.string() })),
 *   output: zodSchema(userSchema),
 *   docs: { description: 'Get a user by ID' },
 * })
 * ```
 *
 * @example Mutation with context
 * ```typescript
 * defineMutation({
 *   input: zodSchema(z.object({ name: z.string() })),
 *   output: zodSchema(z.object({ id: z.string() })),
 *   context: zodSchema(executionContextSchema),
 *   docs: { description: 'Create a project' },
 * })
 * ```
 */
interface DefineFieldInput<
  TInput extends SchemaAdapter | undefined = undefined,
  TOutput extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
> {
  /** Input arguments validation schema. */
  readonly input?: TInput;

  /** Output type validation schema. */
  readonly output?: TOutput;

  /** Context validation schema (e.g., JWT payload from middleware). */
  readonly context?: TContext;

  /** Field documentation. */
  readonly docs?: {
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly deprecated?: boolean;
    readonly deprecationReason?: string;
  };
}

// ============================================================================
// Return type helpers
// ============================================================================

type ResolveInput<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;
type ResolveOutput<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;
type ResolveContext<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;

// ============================================================================
// Internal Factory
// ============================================================================

function createFieldDefinition<
  TOperation extends GraphQLOperationType,
  TInput extends SchemaAdapter | undefined = undefined,
  TOutput extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
>(
  operation: TOperation,
  input: DefineFieldInput<TInput, TOutput, TContext>,
): GraphQLFieldDefinition<
  TOperation,
  ResolveInput<TInput>,
  ResolveOutput<TOutput>,
  ResolveContext<TContext>
> {
  const definition = {
    operation,
    input: input.input ?? undefined,
    output: input.output ?? undefined,
    context: input.context ?? undefined,
    docs: {
      summary: input.docs?.summary,
      description: input.docs?.description,
      tags: input.docs?.tags,
      deprecated: input.docs?.deprecated ?? false,
      deprecationReason: input.docs?.deprecationReason,
    },
    _isGraphQLField: true as const,
    _types: undefined as unknown,
  };

  return Object.freeze(definition) as GraphQLFieldDefinition<
    TOperation,
    ResolveInput<TInput>,
    ResolveOutput<TOutput>,
    ResolveContext<TContext>
  >;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates a GraphQL query field definition.
 *
 * @param config - Field configuration with optional schemas
 * @returns A frozen GraphQLFieldDefinition with operation 'query'
 *
 * @example
 * ```typescript
 * const getUser = defineQuery({
 *   input: zodSchema(z.object({ userId: z.string() })),
 *   output: zodSchema(userSchema),
 *   docs: { description: 'Get a user by ID' },
 * });
 * ```
 */
export function defineQuery<
  TInput extends SchemaAdapter | undefined = undefined,
  TOutput extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
>(
  config: DefineFieldInput<TInput, TOutput, TContext> = {},
): GraphQLFieldDefinition<
  'query',
  ResolveInput<TInput>,
  ResolveOutput<TOutput>,
  ResolveContext<TContext>
> {
  return createFieldDefinition('query', config);
}

/**
 * Creates a GraphQL mutation field definition.
 *
 * @param config - Field configuration with optional schemas
 * @returns A frozen GraphQLFieldDefinition with operation 'mutation'
 *
 * @example
 * ```typescript
 * const createProject = defineMutation({
 *   input: zodSchema(z.object({ name: z.string() })),
 *   output: zodSchema(z.object({ id: z.string() })),
 *   context: zodSchema(executionContextSchema),
 *   docs: { description: 'Create a new project' },
 * });
 * ```
 */
export function defineMutation<
  TInput extends SchemaAdapter | undefined = undefined,
  TOutput extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
>(
  config: DefineFieldInput<TInput, TOutput, TContext> = {},
): GraphQLFieldDefinition<
  'mutation',
  ResolveInput<TInput>,
  ResolveOutput<TOutput>,
  ResolveContext<TContext>
> {
  return createFieldDefinition('mutation', config);
}

/**
 * Creates a GraphQL subscription field definition.
 *
 * Subscription handlers return an `AsyncIterable` of values rather than
 * a single response. The output schema validates each emitted value.
 *
 * @param config - Field configuration with optional schemas
 * @returns A frozen GraphQLFieldDefinition with operation 'subscription'
 *
 * @example
 * ```typescript
 * const onTicketCreated = defineSubscription({
 *   input: zodSchema(z.object({ projectId: z.string() })),
 *   output: zodSchema(ticketSchema),
 *   docs: { description: 'Subscribe to new tickets in a project' },
 * });
 * ```
 */
export function defineSubscription<
  TInput extends SchemaAdapter | undefined = undefined,
  TOutput extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
>(
  config: DefineFieldInput<TInput, TOutput, TContext> = {},
): GraphQLFieldDefinition<
  'subscription',
  ResolveInput<TInput>,
  ResolveOutput<TOutput>,
  ResolveContext<TContext>
> {
  return createFieldDefinition('subscription', config);
}
