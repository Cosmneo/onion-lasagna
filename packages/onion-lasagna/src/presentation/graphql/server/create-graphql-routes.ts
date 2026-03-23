/**
 * @fileoverview Internal implementation for creating GraphQL routes with auto-validation.
 *
 * Generates GraphQL field handlers from a schema definition.
 * Each handler automatically validates incoming args and outgoing results
 * against the field's schemas.
 *
 * @module graphql/server/create-graphql-routes
 * @internal
 */

import type { SchemaAdapter, ValidationIssue } from '../../http/schema/types';
import type {
  GraphQLSchemaConfig,
  GraphQLSchemaDefinition,
  GraphQLFieldDefinition,
} from '../field/types';
import { isSchemaDefinition, collectFields } from '../field/types';
import { generateFieldId } from '../field/utils';
import { mapErrorToGraphQLError } from '../shared/error-mapping';
import type {
  AnyGraphQLHandlerConfig,
  CreateGraphQLRoutesOptions,
  GraphQLHandlerContext,
  UnifiedGraphQLField,
  ValidatedArgs,
} from './types';
import { isSimpleGraphQLHandlerConfig } from './types';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';
import { UnauthorizedError } from '../../../app/exceptions/unauthorized.error';

/**
 * Internal implementation for creating GraphQL routes.
 * Used by the builder pattern (graphqlRoutes).
 *
 * @internal
 */
export function createGraphQLRoutesInternal<T extends GraphQLSchemaConfig>(
  schema: T | GraphQLSchemaDefinition<T>,
  handlers: Record<string, AnyGraphQLHandlerConfig<GraphQLFieldDefinition, unknown, unknown>>,
  options?: CreateGraphQLRoutesOptions,
): UnifiedGraphQLField[] {
  const config = isSchemaDefinition(schema) ? schema.fields : schema;
  const collectedFields = collectFields(config);

  const result: UnifiedGraphQLField[] = [];

  const resolvedOptions: CreateGraphQLRoutesOptions = {
    ...options,
    validateInput: options?.validateInput ?? true,
    validateOutput: options?.validateOutput ?? true,
    allowPartial: options?.allowPartial ?? false,
  };

  for (const { key, field } of collectedFields) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlerConfig = handlers[key] as
      | AnyGraphQLHandlerConfig<GraphQLFieldDefinition, any, any>
      | undefined;

    if (!handlerConfig) {
      if (resolvedOptions.allowPartial) {
        continue;
      }
      throw new Error(
        `Missing handler for field "${key}". All fields must have a handler configuration.`,
      );
    }

    result.push(createFieldHandler(key, field, handlerConfig, resolvedOptions));
  }

  return result;
}

/**
 * Creates a single field handler with validation and error mapping.
 */
function createFieldHandler(
  key: string,
  field: GraphQLFieldDefinition,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: AnyGraphQLHandlerConfig<GraphQLFieldDefinition, any, any>,
  options: CreateGraphQLRoutesOptions,
): UnifiedGraphQLField {
  const middleware = config.middleware ?? [];
  const globalMiddleware = options?.middleware ?? [];
  const allMiddleware = [...globalMiddleware, ...middleware];
  const shouldValidateInput = options.validateInput ?? true;
  const shouldValidateOutput = options.validateOutput ?? true;

  return {
    key,
    operation: field.operation,
    metadata: {
      fieldId: generateFieldId(key),
      description: field.docs.description,
      tags: field.docs.tags as string[],
      deprecated: field.docs.deprecated,
      deprecationReason: field.docs.deprecationReason,
    },
    handler: async (rawArgs: unknown, rawContext: unknown): Promise<unknown> => {
      // Create context
      const context: GraphQLHandlerContext = options?.createContext
        ? options.createContext(rawContext)
        : ((rawContext as GraphQLHandlerContext) ?? { requestId: generateRequestId() });

      // Validate context (if schema defined)
      // Context validation failures → UnauthorizedError (401 semantics).
      // Error message is generic to prevent leaking context schema details
      // (field names, types, constraints) to unauthenticated clients.
      let validatedContext: unknown = context;
      if (field.context) {
        const contextResult = validateContextData(field, context);
        if (!contextResult.success) {
          throw new UnauthorizedError({
            message: 'Authentication required',
          });
        }
        validatedContext = contextResult.data;
      }

      // Validate input args (if enabled and schema defined)
      let validatedInput: unknown = rawArgs;
      if (shouldValidateInput && field.input) {
        const inputResult = validateInputData(field, rawArgs);
        if (!inputResult.success) {
          const errors = inputResult.errors ?? [];
          throw new ObjectValidationError({
            message: 'Input validation failed',
            validationErrors: errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          });
        }
        validatedInput = inputResult.data;
      }

      const validatedArgs: ValidatedArgsInternal = {
        input: validatedInput,
        raw: rawArgs,
      };

      // Execute the pipeline
      const executePipeline = async (): Promise<unknown> => {
        if (isSimpleGraphQLHandlerConfig(config)) {
          return config.handler(
            validatedArgs as unknown as ValidatedArgs<GraphQLFieldDefinition>,
            validatedContext as GraphQLHandlerContext,
          );
        } else {
          const { argsMapper, useCase, responseMapper } = config;

          const input = argsMapper(
            validatedArgs as unknown as ValidatedArgs<GraphQLFieldDefinition>,
            validatedContext as GraphQLHandlerContext,
          );

          const output = await useCase.execute(input);

          return responseMapper(output);
        }
      };

      let result: unknown;

      if (allMiddleware.length === 0) {
        result = await executePipeline();
      } else {
        // Build middleware chain with re-entrancy guard
        let index = 0;
        let called = false;
        const next = async (): Promise<unknown> => {
          if (index >= allMiddleware.length) {
            if (called) throw new Error('next() called after pipeline already executed');
            called = true;
            return executePipeline();
          }
          const currentIndex = index++;
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- index bounds checked above
          const mw = allMiddleware[currentIndex]!;
          return mw(rawArgs, context, next);
        };

        result = await next();
      }

      // Validate output (if enabled and schema defined)
      if (shouldValidateOutput && field.output) {
        const outputResult = validateOutputData(field, result);
        if (!outputResult.success) {
          const details = outputResult.errors
            ?.map((e) => `${e.path.join('.')}: ${e.message}`)
            .join('; ');
          throw new ObjectValidationError({
            message: `Output validation failed for field "${key}": ${details}`,
            validationErrors: (outputResult.errors ?? []).map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          });
        }
      }

      return result;
    },
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

interface ValidationResultInternal {
  success: boolean;
  errors?: ValidationIssue[];
  data?: unknown;
}

/**
 * Validates input args against the field's input schema.
 */
function validateInputData(field: GraphQLFieldDefinition, args: unknown): ValidationResultInternal {
  const schema = field.input as SchemaAdapter | undefined;
  if (!schema) return { success: true, data: args };

  const result = schema.validate(args);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.issues.map((issue) => ({
    ...issue,
    path: ['input', ...issue.path],
  }));

  return { success: false, errors };
}

/**
 * Validates output data against the field's output schema.
 */
function validateOutputData(
  field: GraphQLFieldDefinition,
  data: unknown,
): ValidationResultInternal {
  const schema = field.output as SchemaAdapter | undefined;
  if (!schema) return { success: true, data };

  const result = schema.validate(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.issues.map((issue) => ({
    ...issue,
    path: ['output', ...issue.path],
  }));

  return { success: false, errors };
}

/**
 * Validates context data against the field's context schema.
 */
function validateContextData(
  field: GraphQLFieldDefinition,
  context: GraphQLHandlerContext,
): ValidationResultInternal {
  const schema = field.context as SchemaAdapter | undefined;
  if (!schema) return { success: true, data: context };

  const result = schema.validate(context);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.issues.map((issue) => ({
    ...issue,
    path: ['context', ...issue.path],
  }));

  return { success: false, errors };
}

/**
 * Internal validated args type with unknown fields.
 * Used inside createFieldHandler where specific types are erased.
 */
interface ValidatedArgsInternal {
  readonly input: unknown;
  readonly raw: unknown;
}

/**
 * Generates a unique request ID.
 */
function generateRequestId(): string {
  return `gql_${crypto.randomUUID()}`;
}
