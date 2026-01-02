/**
 * @fileoverview Factory function for creating route definitions.
 *
 * The `defineRoute` function is the main entry point for defining routes
 * in the unified system. It provides type inference and validation
 * for route configurations.
 *
 * @module unified/route/define-route
 */

import type { SchemaAdapter, InferOutput } from '../schema/types';
import type { HttpMethod, ResponsesConfig, RouteDefinition, PathParams } from './types';

// ============================================================================
// Input Types
// ============================================================================

/**
 * Request body configuration input.
 */
interface BodyInput<TSchema extends SchemaAdapter> {
  readonly schema: TSchema;
  readonly contentType?: string;
  readonly required?: boolean;
  readonly description?: string;
}

/**
 * Query parameters configuration input.
 */
interface QueryInput<TSchema extends SchemaAdapter> {
  readonly schema: TSchema;
  readonly description?: string;
}

/**
 * Path parameters configuration input.
 */
interface ParamsInput<TSchema extends SchemaAdapter> {
  readonly schema: TSchema;
  readonly description?: string;
}

/**
 * Headers configuration input.
 */
interface HeadersInput<TSchema extends SchemaAdapter> {
  readonly schema: TSchema;
  readonly description?: string;
}

/**
 * Context configuration input.
 * Used to validate and type context data from middleware (e.g., JWT payload).
 */
interface ContextInput<TSchema extends SchemaAdapter> {
  readonly schema: TSchema;
  readonly description?: string;
}

/**
 * Response configuration input.
 */
interface ResponseInput<TSchema extends SchemaAdapter | undefined = undefined> {
  readonly description: string;
  readonly schema?: TSchema;
  readonly contentType?: string;
}

/**
 * Complete input for defineRoute.
 */
interface DefineRouteInput<
  TMethod extends HttpMethod,
  TPath extends string,
  TBody extends SchemaAdapter | undefined = undefined,
  TQuery extends SchemaAdapter | undefined = undefined,
  TParams extends SchemaAdapter | undefined = undefined,
  THeaders extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
  TResponses extends Record<number, ResponseInput<SchemaAdapter | undefined>> = Record<
    number,
    never
  >,
> {
  readonly method: TMethod;
  readonly path: TPath;
  readonly request?: {
    readonly body?: TBody extends SchemaAdapter ? BodyInput<TBody> : undefined;
    readonly query?: TQuery extends SchemaAdapter ? QueryInput<TQuery> : undefined;
    readonly params?: TParams extends SchemaAdapter ? ParamsInput<TParams> : undefined;
    readonly headers?: THeaders extends SchemaAdapter ? HeadersInput<THeaders> : undefined;
    readonly context?: TContext extends SchemaAdapter ? ContextInput<TContext> : undefined;
  };
  readonly responses: TResponses;
  readonly docs?: {
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly operationId?: string;
    readonly deprecated?: boolean;
    readonly security?: readonly Record<string, readonly string[]>[];
    readonly externalDocs?: {
      readonly url: string;
      readonly description?: string;
    };
  };
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Converts response inputs to response config type.
 */
type ToResponsesConfig<T extends Record<number, ResponseInput<SchemaAdapter | undefined>>> = {
  [K in keyof T]: T[K] extends ResponseInput<infer TSchema>
    ? {
        description: string;
        schema: TSchema extends SchemaAdapter ? TSchema : undefined;
        contentType?: string;
      }
    : never;
};

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a route definition from the provided configuration.
 *
 * This is the main entry point for defining routes in the unified system.
 * The resulting definition can be used for:
 * - Type-safe client generation
 * - Server-side route registration
 * - OpenAPI specification generation
 *
 * @param input - Route configuration
 * @returns A frozen RouteDefinition object with full type information
 *
 * @example Basic GET route
 * ```typescript
 * import { defineRoute } from '@cosmneo/onion-lasagna/unified';
 * import { zodSchema, z } from '@cosmneo/onion-lasagna/unified/schema/zod';
 *
 * const listUsers = defineRoute({
 *   method: 'GET',
 *   path: '/api/users',
 *   request: {
 *     query: {
 *       schema: zodSchema(z.object({
 *         page: z.coerce.number().optional().default(1),
 *         limit: z.coerce.number().optional().default(20),
 *       })),
 *     },
 *   },
 *   responses: {
 *     200: {
 *       description: 'List of users',
 *       schema: zodSchema(z.object({
 *         users: z.array(z.object({
 *           id: z.string(),
 *           name: z.string(),
 *         })),
 *         total: z.number(),
 *       })),
 *     },
 *   },
 *   docs: {
 *     summary: 'List all users',
 *     tags: ['Users'],
 *   },
 * });
 * ```
 *
 * @example POST route with path parameters
 * ```typescript
 * const createTask = defineRoute({
 *   method: 'POST',
 *   path: '/api/projects/:projectId/tasks',
 *   request: {
 *     body: {
 *       schema: zodSchema(z.object({
 *         title: z.string().min(1).max(200),
 *         description: z.string().optional(),
 *       })),
 *     },
 *   },
 *   responses: {
 *     201: {
 *       description: 'Task created',
 *       schema: zodSchema(z.object({
 *         id: z.string().uuid(),
 *         title: z.string(),
 *         projectId: z.string(),
 *         createdAt: z.string().datetime(),
 *       })),
 *     },
 *     400: {
 *       description: 'Invalid request',
 *     },
 *     404: {
 *       description: 'Project not found',
 *     },
 *   },
 *   docs: {
 *     summary: 'Create a new task',
 *     tags: ['Tasks'],
 *     operationId: 'createTask',
 *   },
 * });
 * ```
 */
export function defineRoute<
  TMethod extends HttpMethod,
  TPath extends string,
  TBody extends SchemaAdapter | undefined = undefined,
  TQuery extends SchemaAdapter | undefined = undefined,
  TParams extends SchemaAdapter | undefined = undefined,
  THeaders extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
  TResponses extends Record<number, ResponseInput<SchemaAdapter | undefined>> = Record<
    number,
    never
  >,
>(
  input: DefineRouteInput<TMethod, TPath, TBody, TQuery, TParams, THeaders, TContext, TResponses>,
): RouteDefinition<
  TMethod,
  TPath,
  TBody extends SchemaAdapter ? InferOutput<TBody> : undefined,
  TQuery extends SchemaAdapter ? InferOutput<TQuery> : undefined,
  TParams extends SchemaAdapter ? InferOutput<TParams> : PathParams<TPath>,
  THeaders extends SchemaAdapter ? InferOutput<THeaders> : undefined,
  TContext extends SchemaAdapter ? InferOutput<TContext> : undefined,
  ToResponsesConfig<TResponses> & ResponsesConfig
> {
  const definition = {
    method: input.method,
    path: input.path,
    request: {
      body: input.request?.body ?? undefined,
      query: input.request?.query ?? undefined,
      params: input.request?.params ?? undefined,
      headers: input.request?.headers ?? undefined,
      context: input.request?.context ?? undefined,
    },
    responses: input.responses as ToResponsesConfig<TResponses> & ResponsesConfig,
    docs: {
      summary: input.docs?.summary,
      description: input.docs?.description,
      tags: input.docs?.tags,
      operationId: input.docs?.operationId,
      deprecated: input.docs?.deprecated ?? false,
      security: input.docs?.security,
      externalDocs: input.docs?.externalDocs,
    },
    _types: undefined as unknown,
  } as RouteDefinition<
    TMethod,
    TPath,
    TBody extends SchemaAdapter ? InferOutput<TBody> : undefined,
    TQuery extends SchemaAdapter ? InferOutput<TQuery> : undefined,
    TParams extends SchemaAdapter ? InferOutput<TParams> : PathParams<TPath>,
    THeaders extends SchemaAdapter ? InferOutput<THeaders> : undefined,
    TContext extends SchemaAdapter ? InferOutput<TContext> : undefined,
    ToResponsesConfig<TResponses> & ResponsesConfig
  >;

  // Freeze the definition to prevent accidental mutation
  return Object.freeze(definition);
}
