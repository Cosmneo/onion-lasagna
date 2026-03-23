export type {
  GraphQLOperationType,
  GraphQLFieldDocumentation,
  GraphQLFieldDefinition,
  InferFieldOperation,
  InferFieldInput,
  InferFieldOutput,
  InferFieldContext,
} from './field-definition.type';

export type {
  GraphQLSchemaEntry,
  GraphQLSchemaConfig,
  GraphQLSchemaDefaults,
  GraphQLSchemaDefinition,
  FlattenSchema,
  SchemaKeys,
  GetField,
  DeepMergeSchemas,
  DeepMergeSchemasAll,
} from './schema-definition.type';

export { isFieldDefinition, isSchemaDefinition, collectFields } from './schema-definition.type';
