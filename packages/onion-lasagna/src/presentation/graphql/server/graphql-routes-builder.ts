/**
 * @fileoverview Builder pattern for creating type-safe GraphQL routes.
 *
 * The `graphqlRoutes` function returns a builder that provides 100% type inference
 * for all handler parameters — no manual type annotations required.
 *
 * @module graphql/server/graphql-routes-builder
 */

import type {
  GraphQLSchemaConfig,
  GraphQLSchemaDefinition,
  GetField,
  SchemaKeys,
  GraphQLFieldDefinition,
} from '../field/types';
import type {
  AnyGraphQLHandlerConfig,
  CreateGraphQLRoutesOptions,
  GraphQLHandlerConfig,
  GraphQLMiddlewareFunction,
  SimpleGraphQLHandlerConfig,
  SimpleGraphQLHandlerFn,
  TypedGraphQLContext,
  UnifiedGraphQLField,
  ValidatedArgs,
} from './types';
import { createGraphQLRoutesInternal } from './create-graphql-routes';

// ============================================================================
// Builder Types
// ============================================================================

/**
 * Error type displayed when attempting to build() with missing handlers.
 * The `___missingFields` property shows which fields are missing.
 */
export interface MissingHandlersError<TMissing extends string> {
  /**
   * This error indicates that not all GraphQL fields have handlers.
   * Use buildPartial() to build with only the defined handlers,
   * or add handlers for the missing fields.
   */
  (options?: never): never;
  /** Fields that are missing handlers. */
  readonly ___missingFields: TMissing;
}

/**
 * Handler configuration for the builder pattern.
 */
export interface BuilderGraphQLHandlerConfig<
  TField extends GraphQLFieldDefinition,
  TInput,
  TOutput,
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
 * Builder interface for creating type-safe GraphQL routes.
 *
 * Each `.handle()` call captures the specific field type and provides
 * full type inference for argsMapper, useCase, and responseMapper.
 *
 * @typeParam T - The schema configuration type
 * @typeParam THandled - Union of field keys that have handlers (accumulates)
 *
 * @example
 * ```typescript
 * const fields = graphqlRoutes(projectSchema)
 *   .handleWithUseCase('projects.create', {
 *     argsMapper: (args, ctx) => ({
 *       name: args.input.name,
 *       createdBy: ctx.userId,
 *     }),
 *     useCase: createProjectUseCase,
 *     responseMapper: (output) => ({ projectId: output.projectId }),
 *   })
 *   .handle('projects.list', async (args) => {
 *     return allProjects;
 *   })
 *   .build();
 * ```
 */
export interface GraphQLRoutesBuilder<
  T extends GraphQLSchemaConfig,
  THandled extends string = never,
> {
  /**
   * Register a simple handler for a field.
   * The handler receives validated args and context, returns output directly.
   */
  handle<K extends Exclude<SchemaKeys<T>, THandled>>(
    key: K,
    handlerOrConfig:
      | SimpleGraphQLHandlerFn<GetField<T, K>>
      | SimpleGraphQLHandlerConfig<GetField<T, K>>,
  ): GraphQLRoutesBuilder<T, THandled | K>;

  /**
   * Register a handler using the use case pattern.
   * Follows: argsMapper → useCase.execute() → responseMapper
   */
  handleWithUseCase<K extends Exclude<SchemaKeys<T>, THandled>, TInput, TOutput>(
    key: K,
    config: BuilderGraphQLHandlerConfig<GetField<T, K>, TInput, TOutput>,
  ): GraphQLRoutesBuilder<T, THandled | K>;

  /**
   * Build the fields array for framework adapter registration.
   *
   * This method is only available when ALL fields have handlers.
   * If some fields are missing handlers, use `buildPartial()` instead.
   */
  build: [Exclude<SchemaKeys<T>, THandled>] extends [never]
    ? (options?: CreateGraphQLRoutesOptions) => UnifiedGraphQLField[]
    : MissingHandlersError<Exclude<SchemaKeys<T>, THandled>>;

  /**
   * Build fields for only the defined handlers.
   * No compile-time enforcement of completeness.
   */
  buildPartial(options?: CreateGraphQLRoutesOptions): UnifiedGraphQLField[];
}

// ============================================================================
// Builder Implementation
// ============================================================================

/**
 * Internal builder implementation.
 *
 * Uses an immutable pattern where each handle() call returns a new
 * builder instance with the updated handlers map.
 */
class GraphQLRoutesBuilderImpl<T extends GraphQLSchemaConfig, THandled extends string = never> {
  private readonly schema: T | GraphQLSchemaDefinition<T>;
  private readonly handlers: Map<
    string,
    AnyGraphQLHandlerConfig<GraphQLFieldDefinition, unknown, unknown>
  >;

  constructor(
    schema: T | GraphQLSchemaDefinition<T>,
    handlers?: Map<string, AnyGraphQLHandlerConfig<GraphQLFieldDefinition, unknown, unknown>>,
  ) {
    this.schema = schema;
    this.handlers = handlers ?? new Map();
  }

  handle<K extends Exclude<SchemaKeys<T>, THandled>>(
    key: K,
    handlerOrConfig:
      | SimpleGraphQLHandlerFn<GetField<T, K>>
      | SimpleGraphQLHandlerConfig<GetField<T, K>>,
  ): GraphQLRoutesBuilder<T, THandled | K> {
    // Cast through unknown is safe: type erasure in the builder requires this cast
    // The type system tracks the specific field types through the interface
    const config: SimpleGraphQLHandlerConfig<GraphQLFieldDefinition> =
      typeof handlerOrConfig === 'function'
        ? { handler: handlerOrConfig as unknown as SimpleGraphQLHandlerFn<GraphQLFieldDefinition> }
        : (handlerOrConfig as unknown as SimpleGraphQLHandlerConfig<GraphQLFieldDefinition>);

    const newHandlers = new Map(this.handlers);
    newHandlers.set(key as string, config);

    return new GraphQLRoutesBuilderImpl<T, THandled | K>(
      this.schema,
      newHandlers,
    ) as unknown as GraphQLRoutesBuilder<T, THandled | K>;
  }

  handleWithUseCase<K extends Exclude<SchemaKeys<T>, THandled>, TInput, TOutput>(
    key: K,
    config: BuilderGraphQLHandlerConfig<GetField<T, K>, TInput, TOutput>,
  ): GraphQLRoutesBuilder<T, THandled | K> {
    const newHandlers = new Map(this.handlers);
    // Cast through unknown is safe: the type system tracks THandled | K through the interface
    newHandlers.set(
      key as string,
      config as unknown as GraphQLHandlerConfig<GraphQLFieldDefinition, unknown, unknown>,
    );

    return new GraphQLRoutesBuilderImpl<T, THandled | K>(
      this.schema,
      newHandlers,
    ) as unknown as GraphQLRoutesBuilder<T, THandled | K>;
  }

  build(options?: CreateGraphQLRoutesOptions): UnifiedGraphQLField[] {
    return createGraphQLRoutesInternal(this.schema, Object.fromEntries(this.handlers), options);
  }

  buildPartial(options?: CreateGraphQLRoutesOptions): UnifiedGraphQLField[] {
    return createGraphQLRoutesInternal(this.schema, Object.fromEntries(this.handlers), {
      ...options,
      allowPartial: true,
    });
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates a type-safe GraphQL routes builder for a schema.
 *
 * The builder pattern provides 100% type inference for all handler parameters:
 * - `args.input` is typed from the field's input schema
 * - `ctx` is typed from the field's context schema (or GraphQLHandlerContext)
 * - `output` in responseMapper is typed from the use case
 *
 * @param schema - GraphQL schema definition or schema config
 * @returns Builder for registering handlers
 *
 * @example Basic usage
 * ```typescript
 * import { graphqlRoutes } from '@cosmneo/onion-lasagna/graphql/server';
 * import { projectSchema } from './schema';
 *
 * const fields = graphqlRoutes(projectSchema)
 *   .handleWithUseCase('projects.create', {
 *     argsMapper: (args, ctx) => ({
 *       name: args.input.name,
 *       createdBy: ctx.userId,
 *     }),
 *     useCase: createProjectUseCase,
 *     responseMapper: (output) => ({ projectId: output.projectId }),
 *   })
 *   .handle('projects.list', async () => allProjects)
 *   .build();
 * ```
 */
export function graphqlRoutes<T extends GraphQLSchemaConfig>(
  schema: T | GraphQLSchemaDefinition<T>,
): GraphQLRoutesBuilder<T, never> {
  return new GraphQLRoutesBuilderImpl(schema) as unknown as GraphQLRoutesBuilder<T, never>;
}
