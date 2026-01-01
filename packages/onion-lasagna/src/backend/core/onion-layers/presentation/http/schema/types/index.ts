/**
 * @fileoverview Schema type exports.
 * @module unified/schema/types
 */

export type {
  JsonSchema,
  JsonSchemaType,
  JsonSchemaStringFormat,
} from './json-schema.type';

export type {
  ValidationIssue,
  ValidationSuccess,
  ValidationFailure,
  ValidationResult,
} from './validation.type';
export { isValidationSuccess, isValidationFailure } from './validation.type';

export type {
  SchemaAdapter,
  JsonSchemaOptions,
  InferOutput,
  InferInput,
} from './schema-adapter.type';
export {
  isSchemaAdapter,
  createPassthroughAdapter,
  createRejectingAdapter,
} from './schema-adapter.type';
