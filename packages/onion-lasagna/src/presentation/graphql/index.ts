// Field layer: defineQuery, defineMutation, defineSubscription, defineGraphQLSchema, mergeGraphQLSchemas
export {
  defineQuery,
  defineMutation,
  defineSubscription,
  defineGraphQLSchema,
  mergeGraphQLSchemas,
  generateFieldId,
} from './field';
export type {
  DefineGraphQLSchemaOptions,
  GraphQLOperationType,
  GraphQLFieldDocumentation,
  GraphQLFieldDefinition,
  GraphQLSchemaEntry,
  GraphQLSchemaConfig,
  GraphQLSchemaDefaults,
  GraphQLSchemaDefinition,
  FlattenSchema,
  SchemaKeys,
  GetField,
  DeepMergeSchemas,
  DeepMergeSchemasAll,
  InferFieldOperation,
  InferFieldInput,
  InferFieldOutput,
  InferFieldContext,
} from './field';
export { isFieldDefinition, isSchemaDefinition, collectFields } from './field';

// Server layer: graphqlRoutes builder
export { graphqlRoutes } from './server';
export type {
  GraphQLRoutesBuilder,
  MissingHandlersError,
  BuilderGraphQLHandlerConfig,
  ValidatedArgs,
  TypedGraphQLContext,
  GraphQLHandlerContext,
  GraphQLHandlerConfig,
  SimpleGraphQLHandlerFn,
  SimpleGraphQLHandlerConfig,
  GraphQLMiddlewareFunction,
  CreateGraphQLRoutesOptions,
  UnifiedGraphQLField,
  UseCasePort,
} from './server';
export { isSimpleGraphQLHandlerConfig } from './server';

// SDL layer: schema definition language generation
export { generateGraphQLSDL } from './sdl';
export type { GraphQLSDLConfig } from './sdl';

// Shared layer: error mapping
export type {
  GraphQLErrorCode,
  GraphQLErrorExtensions,
  GraphQLValidationErrorItem,
  MappedGraphQLError,
} from './shared';
export {
  mapErrorToGraphQLError,
  getGraphQLErrorCode,
  shouldMaskGraphQLError,
} from './shared';
