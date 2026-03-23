/**
 * @fileoverview Server types for the GraphQL field system.
 *
 * @module graphql/server/types
 */

import type {
  GraphQLFieldDefinition,
  GraphQLOperationType,
} from '../field/types';

// Re-export UseCasePort from HTTP — same interface, no duplication
export type { UseCasePort } from '../../http/server/types';

// ============================================================================
// Validated Args
// ============================================================================

/**
 * Validated arguments with typed data.
 * This is what handlers receive after input validation passes.
 */
export interface ValidatedArgs<TField extends GraphQLFieldDefinition> {
  /** Validated input arguments. */
  readonly input: TField['_types']['input'];

  /** Raw unvalidated arguments for advanced use cases. */
  readonly raw: unknown;
}

/**
 * Typed GraphQL context based on field definition.
 * If the field defines a context schema, this will be the validated type.
 * Otherwise, it falls back to the generic GraphQLHandlerContext.
 */
export type TypedGraphQLContext<TField extends GraphQLFieldDefinition> =
  TField['_types']['context'] extends undefined
    ? GraphQLHandlerContext
    : TField['_types']['context'];

// ============================================================================
// Handler Context
// ============================================================================

/**
 * Context passed to GraphQL handlers.
 * Can be extended with custom context via graphqlRoutes options.
 */
export interface GraphQLHandlerContext {
  /** Request ID for tracing. */
  readonly requestId?: string;

  /** Additional context data. */
  readonly [key: string]: unknown;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Handler configuration using the use case pattern.
 *
 * @typeParam TField - The field definition type
 * @typeParam TInput - Use case input type
 * @typeParam TOutput - Use case output type
 */
export interface GraphQLHandlerConfig<
  TField extends GraphQLFieldDefinition,
  TInput = void,
  TOutput = void,
> {
  /**
   * Maps the validated args to use case input.
   * Both `args` and `ctx` are fully typed based on field schemas.
   */
  readonly argsMapper: (
    args: ValidatedArgs<TField>,
    ctx: TypedGraphQLContext<TField>,
  ) => TInput;

  /** The use case to execute. */
  readonly useCase: { execute(input?: TInput): Promise<TOutput> };

  /**
   * Maps the use case output to the GraphQL response.
   */
  readonly responseMapper: (output: TOutput) => TField['_types']['output'];

  /** Middleware to run before the handler. */
  readonly middleware?: readonly GraphQLMiddlewareFunction[];
}

/**
 * Simple handler function that directly returns the output.
 * Use this for query and mutation fields.
 */
export type SimpleGraphQLHandlerFn<TField extends GraphQLFieldDefinition> = (
  args: ValidatedArgs<TField>,
  ctx: TypedGraphQLContext<TField>,
) => Promise<TField['_types']['output']> | TField['_types']['output'];

/**
 * Subscription handler function that returns an async iterable.
 * Each yielded value is sent to the subscriber.
 */
export type SimpleGraphQLSubscriptionFn<TField extends GraphQLFieldDefinition> = (
  args: ValidatedArgs<TField>,
  ctx: TypedGraphQLContext<TField>,
) => AsyncIterable<TField['_types']['output']>;

/**
 * Configuration for a simple handler (no use case).
 */
export interface SimpleGraphQLHandlerConfig<TField extends GraphQLFieldDefinition> {
  readonly handler: SimpleGraphQLHandlerFn<TField>;
  readonly middleware?: readonly GraphQLMiddlewareFunction[];
}

/**
 * Union of all handler config types.
 * Used internally to store handlers in the builder.
 */
export type AnyGraphQLHandlerConfig<
  TField extends GraphQLFieldDefinition,
  TInput = unknown,
  TOutput = unknown,
> = GraphQLHandlerConfig<TField, TInput, TOutput> | SimpleGraphQLHandlerConfig<TField>;

/**
 * Type guard to check if config is a simple GraphQL handler.
 */
export function isSimpleGraphQLHandlerConfig(
  config: AnyGraphQLHandlerConfig<GraphQLFieldDefinition, unknown, unknown>,
): config is SimpleGraphQLHandlerConfig<GraphQLFieldDefinition> {
  return 'handler' in config && typeof config.handler === 'function';
}

/**
 * GraphQL middleware function type.
 */
export type GraphQLMiddlewareFunction = (
  args: unknown,
  context: GraphQLHandlerContext,
  next: () => Promise<unknown>,
) => Promise<unknown>;

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * Options for creating GraphQL routes.
 */
export interface CreateGraphQLRoutesOptions {
  /** Global middleware to run before all handlers. */
  readonly middleware?: readonly GraphQLMiddlewareFunction[];

  /**
   * Whether to validate incoming args against field schemas.
   * When enabled, invalid args throw ObjectValidationError.
   * @default true
   */
  readonly validateInput?: boolean;

  /**
   * Whether to validate outgoing results against field schemas.
   * When enabled, invalid results log a warning.
   * @default true
   */
  readonly validateOutput?: boolean;

  /**
   * Context factory to create handler context.
   */
  readonly createContext?: (rawContext: unknown) => GraphQLHandlerContext;

  /**
   * Allow partial handler configuration (not all fields need handlers).
   * When true, missing handlers are silently skipped.
   * When false (default), missing handlers throw an error.
   * @default false
   * @internal Used by builder pattern's buildPartial()
   */
  readonly allowPartial?: boolean;
}

// ============================================================================
// Unified GraphQL Field (for framework adapters)
// ============================================================================

/**
 * GraphQL field input compatible with framework adapters.
 * This is the output of graphqlRoutes().build().
 */
export interface UnifiedGraphQLField {
  /** Schema key path (e.g., 'users.get'). */
  readonly key: string;

  /** GraphQL operation type. */
  readonly operation: GraphQLOperationType;

  /** Handler function. */
  readonly handler: (args: unknown, context: unknown) => Promise<unknown>;

  /** Field metadata for documentation. */
  readonly metadata: {
    readonly fieldId?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly deprecated?: boolean;
    readonly deprecationReason?: string;
  };
}
