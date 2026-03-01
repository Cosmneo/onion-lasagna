/**
 * @fileoverview Unified Route System (v2 — flat API)
 *
 * A comprehensive system for defining routes that powers:
 * - Type-safe client generation
 * - Server-side route registration with automatic validation
 * - OpenAPI specification generation
 *
 * @module unified
 *
 * @example Complete workflow
 * ```typescript
 * // 1. Define schemas (in infra layer)
 * import { z } from 'zod';
 * import { zodSchema } from '@cosmneo/onion-lasagna-zod';
 *
 * const userSchema = zodSchema(z.object({
 *   id: z.string().uuid(),
 *   name: z.string().min(1).max(100),
 *   email: z.string().email(),
 * }));
 *
 * // 2. Define routes (flat API)
 * import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/http';
 *
 * const getUser = defineRoute({
 *   method: 'GET',
 *   path: '/api/users/:userId',
 *   response: userSchema,
 *   docs: { summary: 'Get a user by ID', tags: ['Users'] },
 * });
 *
 * const api = defineRouter({
 *   users: { get: getUser, list: listUsers, create: createUser },
 * });
 *
 * // 3. Create client (frontend)
 * import { createClient } from '@cosmneo/onion-lasagna-client';
 *
 * const client = createClient(api, { baseUrl: 'http://localhost:3000' });
 * const user = await client.users.get({ pathParams: { userId: '123' } });
 *
 * // 4. Create server routes (backend)
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 *
 * const routes = serverRoutes(api)
 *   .handle('users.get', async (req) => {
 *     const user = await db.users.findById(req.pathParams.userId);
 *     return user
 *       ? { status: 200, body: user }
 *       : { status: 404, body: { error: 'Not found' } };
 *   })
 *   .build();
 *
 * // 5. Generate OpenAPI (documentation)
 * import { generateOpenAPI } from '@cosmneo/onion-lasagna/http/openapi';
 *
 * const spec = generateOpenAPI(api, {
 *   info: { title: 'My API', version: '1.0.0' },
 * });
 * ```
 */

// ============================================================================
// Route Definition
// ============================================================================

export { defineRoute } from './route/define-route';
export { defineRouter, mergeRouters } from './route/define-router';
export type { DefineRouterOptions } from './route/define-router';
export { generateOperationId } from './route/utils';

// Route types
export type {
  HttpMethod,
  HttpStatusCode,
  ContentType,
  PathParams,
  HasPathParams,
  ExtractPathParamNames,
  RouteDefinition,
  RouteDocumentation,
  RouterConfig,
  RouterDefinition,
  RouterEntry,
  RouterKeys,
  GetRoute,
  FlattenRouter,
  DeepMergeTwo,
  DeepMergeAll,
  PrettifyDeep,
  InferRouteBody,
  InferRouteQuery,
  InferRoutePathParams,
  InferRouteHeaders,
  InferRouteContext,
  InferRouteResponse,
  InferRouteMethod,
  InferRoutePath,
} from './route/types';

export {
  isRouteDefinition,
  isRouterDefinition,
  collectRoutes,
  buildPath,
  normalizePath,
  pathToRegex,
  getPathParamNames,
  hasPathParams,
} from './route/types';

// ============================================================================
// Schema
// ============================================================================

export type {
  SchemaAdapter,
  JsonSchema,
  JsonSchemaOptions,
  ValidationResult,
  ValidationIssue,
  ValidationSuccess,
  ValidationFailure,
  InferOutput,
  InferInput,
} from './schema/types';

export {
  isSchemaAdapter,
  isValidationSuccess,
  isValidationFailure,
  createPassthroughAdapter,
  createRejectingAdapter,
} from './schema/types';

// ============================================================================
// Server
// ============================================================================

export { serverRoutes } from './server/server-routes-builder';
export type {
  ServerRoutesBuilder,
  MissingHandlersError,
  BuilderHandlerConfig,
} from './server/server-routes-builder';
export type {
  UseCasePort,
  ValidatedRequest,
  TypedContext,
  HandlerContext,
  HandlerResponse,
  RouteHandlerConfig,
  MiddlewareFunction,
  ServerRoutesConfig,
  CreateServerRoutesOptions,
  UnifiedRouteInput,
  RawHttpRequest,
} from './server/types';

// ============================================================================
// OpenAPI
// ============================================================================

export { generateOpenAPI } from './openapi/generate';
export type {
  OpenAPIConfig,
  OpenAPISpec,
  OpenAPIInfo,
  OpenAPIServer,
  OpenAPISecurityScheme,
  OpenAPITag,
} from './openapi/types';

// ============================================================================
// Shared (Error Mapping)
// ============================================================================

export {
  mapErrorToHttpResponse,
  getHttpStatusCode,
  shouldMaskError,
  createErrorResponseBody,
  isErrorType,
  hasValidationErrors,
} from './shared/error-mapping';
export type {
  ErrorItem,
  ErrorResponseBody,
  MappedErrorResponse,
} from './shared/types';
