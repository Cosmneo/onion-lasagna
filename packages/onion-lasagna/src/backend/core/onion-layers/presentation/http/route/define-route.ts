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
  TResponses extends Record<number, ResponseInput<SchemaAdapter | undefined>> = Record<number, never>,
> {
  readonly method: TMethod;
  readonly path: TPath;
  readonly request?: {
    readonly body?: TBody extends SchemaAdapter ? BodyInput<TBody> : undefined;
    readonly query?: TQuery extends SchemaAdapter ? QueryInput<TQuery> : undefined;
    readonly params?: TParams extends SchemaAdapter ? ParamsInput<TParams> : undefined;
    readonly headers?: THeaders extends SchemaAdapter ? HeadersInput<THeaders> : undefined;
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
 * Infers the body type from a body input.
 */
type InferBodyType<T> = T extends BodyInput<infer TSchema>
  ? InferOutput<TSchema>
  : undefined;

/**
 * Infers the query type from a query input.
 */
type InferQueryType<T> = T extends QueryInput<infer TSchema>
  ? InferOutput<TSchema>
  : undefined;

/**
 * Infers the params type from a params input.
 */
type InferParamsType<T, TPath extends string> = T extends ParamsInput<infer TSchema>
  ? InferOutput<TSchema>
  : PathParams<TPath>;

/**
 * Infers the headers type from a headers input.
 */
type InferHeadersType<T> = T extends HeadersInput<infer TSchema>
  ? InferOutput<TSchema>
  : undefined;

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
  TResponses extends Record<number, ResponseInput<SchemaAdapter | undefined>> = Record<number, never>,
>(
  input: DefineRouteInput<TMethod, TPath, TBody, TQuery, TParams, THeaders, TResponses>,
): RouteDefinition<
  TMethod,
  TPath,
  InferBodyType<DefineRouteInput<TMethod, TPath, TBody, TQuery, TParams, THeaders, TResponses>['request']>,
  InferQueryType<DefineRouteInput<TMethod, TPath, TBody, TQuery, TParams, THeaders, TResponses>['request']>,
  InferParamsType<DefineRouteInput<TMethod, TPath, TBody, TQuery, TParams, THeaders, TResponses>['request'], TPath>,
  InferHeadersType<DefineRouteInput<TMethod, TPath, TBody, TQuery, TParams, THeaders, TResponses>['request']>,
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
    InferBodyType<typeof input.request>,
    InferQueryType<typeof input.request>,
    InferParamsType<typeof input.request, TPath>,
    InferHeadersType<typeof input.request>,
    ToResponsesConfig<TResponses> & ResponsesConfig
  >;

  // Freeze the definition to prevent accidental mutation
  return Object.freeze(definition);
}
