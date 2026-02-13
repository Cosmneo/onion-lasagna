/**
 * @fileoverview Factory function for creating server routes with auto-validation.
 *
 * The `createServerRoutes` function generates server-side route handlers
 * from a router definition. Each handler automatically validates incoming
 * requests and outgoing responses against the route's schemas.
 *
 * @module unified/server/create-server-routes
 */

import type { SchemaAdapter, ValidationIssue } from '../schema/types';
import type { RouterConfig, RouterDefinition, RouteDefinition, PrettifyDeep } from '../route/types';
import { isRouterDefinition, collectRoutes, normalizePath } from '../route/types';
import type {
  AnyHandlerConfig,
  CreateServerRoutesOptions,
  HandlerContext,
  HandlerResponse,
  RawHttpRequest,
  ServerRoutesConfig,
  UnifiedRouteInput,
  ValidatedRequest,
} from './types';
import { isSimpleHandlerConfig } from './types';
import { InvalidRequestError } from '../../exceptions/invalid-request.error';
import { ControllerError } from '../../exceptions/controller.error';

/**
 * Creates server routes from a router definition with automatic validation.
 *
 * This function generates route handlers that follow the BaseController pattern:
 * 1. Extract request data (body, query, params, headers)
 * 2. Validate all data against the route's schemas (if validateRequest is true)
 * 3. Call requestMapper to create use case input
 * 4. Execute the use case
 * 5. Call responseMapper to create HTTP response
 * 6. Validate the response against the route's response schema (if validateResponse is true)
 * 7. Return the response
 *
 * Errors from the use case (DomainError, UseCaseError, InfraError, etc.) propagate
 * through to the framework's error handler.
 *
 * @param router - Router definition or router config
 * @param handlers - Map of route keys to handler configurations
 * @param options - Optional configuration (validateRequest and validateResponse default to true)
 * @returns Array of route inputs for framework registration
 *
 * @example Basic usage with use case
 * ```typescript
 * import { createServerRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './routes';
 *
 * const routes = createServerRoutes(projectRouter, {
 *   'projects.create': {
 *     requestMapper: (req) => ({
 *       name: req.body.name,
 *       description: req.body.description,
 *     }),
 *     useCase: createProjectUseCase,
 *     responseMapper: (out) => ({
 *       status: 201,
 *       body: { projectId: out.projectId },
 *     }),
 *   },
 *   'projects.get': {
 *     requestMapper: (req) => ({
 *       projectId: req.pathParams.projectId,
 *     }),
 *     useCase: getProjectUseCase,
 *     responseMapper: (out) => ({
 *       status: 200,
 *       body: out,
 *     }),
 *   },
 * });
 *
 * // Register with Hono
 * registerHonoRoutes(app, routes);
 * ```
 *
 * @example With validation options
 * ```typescript
 * const routes = createServerRoutes(api, handlers, {
 *   validateRequest: true,   // Validate incoming requests (default: true)
 *   validateResponse: true,  // Validate outgoing responses (default: true)
 * });
 * ```
 *
 * @example Disable response validation in production
 * ```typescript
 * const routes = createServerRoutes(api, handlers, {
 *   validateResponse: process.env.NODE_ENV !== 'production',
 * });
 * ```
 */
export function createServerRoutes<T extends RouterConfig>(
  router: T | RouterDefinition<T>,
  handlers: PrettifyDeep<Partial<ServerRoutesConfig<T>>>,
  options?: CreateServerRoutesOptions,
): UnifiedRouteInput[] {
  return createServerRoutesInternal(
    router,
    handlers as Record<string, AnyHandlerConfig<RouteDefinition, unknown, unknown>>,
    options,
  );
}

/**
 * Internal implementation for creating server routes.
 * Used by both createServerRoutes and the builder pattern.
 *
 * @internal
 */
export function createServerRoutesInternal<T extends RouterConfig>(
  router: T | RouterDefinition<T>,
  handlers: Record<string, AnyHandlerConfig<RouteDefinition, unknown, unknown>>,
  options?: CreateServerRoutesOptions,
): UnifiedRouteInput[] {
  const routes = isRouterDefinition(router) ? router.routes : router;
  const collectedRoutes = collectRoutes(routes);

  // Sort routes by specificity: static segments before parameterized
  // This ensures /api/users/me is registered before /api/users/:userId
  const sortedRoutes = sortRoutesBySpecificity(collectedRoutes);

  const result: UnifiedRouteInput[] = [];

  // Default validation options to true, allowPartial to false
  const resolvedOptions: CreateServerRoutesOptions = {
    ...options,
    validateRequest: options?.validateRequest ?? true,
    validateResponse: options?.validateResponse ?? true,
    allowPartial: options?.allowPartial ?? false,
  };

  for (const { key, route } of sortedRoutes) {
    const handlerConfig = handlers[key] as AnyHandlerConfig<RouteDefinition, any, any> | undefined;

    if (!handlerConfig) {
      if (resolvedOptions.allowPartial) {
        // Skip routes without handlers when allowPartial is true
        continue;
      }
      throw new Error(
        `Missing handler for route "${key}". All routes must have a handler configuration.`,
      );
    }

    result.push(createRouteHandler(route, handlerConfig, resolvedOptions));
  }

  return result;
}

/**
 * Sorts routes by path specificity to ensure correct route matching.
 *
 * Static path segments are sorted before parameterized segments at each position.
 * This ensures that `/api/users/me` is registered before `/api/users/:userId`,
 * preventing the parameterized route from incorrectly matching the static path.
 *
 * @example
 * Given routes:
 *   - /api/users/:userId  (parameterized)
 *   - /api/users/me       (static)
 *
 * After sorting:
 *   - /api/users/me       (registered first - matches exactly)
 *   - /api/users/:userId  (registered second - catches remaining)
 */
function sortRoutesBySpecificity<T extends { route: { path: string } }>(routes: T[]): T[] {
  return [...routes].sort((a, b) => {
    const aSegments = a.route.path.split('/').filter(Boolean);
    const bSegments = b.route.path.split('/').filter(Boolean);

    const maxLen = Math.max(aSegments.length, bSegments.length);

    for (let i = 0; i < maxLen; i++) {
      const aSeg = aSegments[i];
      const bSeg = bSegments[i];

      // Missing segment (shorter path) - shorter paths first for same prefix
      if (aSeg === undefined && bSeg !== undefined) return -1;
      if (aSeg !== undefined && bSeg === undefined) return 1;
      if (aSeg === undefined || bSeg === undefined) return 0;

      // Check if segment is parameterized (supports both :param and {param} formats)
      const aIsParam = aSeg.startsWith(':') || (aSeg.startsWith('{') && aSeg.endsWith('}'));
      const bIsParam = bSeg.startsWith(':') || (bSeg.startsWith('{') && bSeg.endsWith('}'));

      // Static segments come before parameterized segments
      if (!aIsParam && bIsParam) return -1;
      if (aIsParam && !bIsParam) return 1;

      // Both static or both parameterized - compare alphabetically for stable sorting
      const cmp = aSeg.localeCompare(bSeg);
      if (cmp !== 0) return cmp;
    }

    return 0;
  });
}

/**
 * Creates a single route handler with validation.
 *
 * Supports two handler patterns:
 * - Simple handler: handler(req, ctx) → response
 * - Use case pattern: requestMapper → useCase.execute → responseMapper
 */
function createRouteHandler(
  route: RouteDefinition,
  // TInput/TOutput are user-defined and erased at this level - any is required for type compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: AnyHandlerConfig<RouteDefinition, any, any>,
  options: CreateServerRoutesOptions,
): UnifiedRouteInput {
  const middleware = config.middleware ?? [];
  const globalMiddleware = options?.middleware ?? [];
  const allMiddleware = [...globalMiddleware, ...middleware];

  const shouldValidateRequest = options.validateRequest ?? true;
  const shouldValidateResponse = options.validateResponse ?? true;

  return {
    method: route.method,
    path: normalizePath(route.path),
    metadata: {
      operationId: route.docs.operationId,
      summary: route.docs.summary,
      description: route.docs.description,
      tags: route.docs.tags as string[],
      deprecated: route.docs.deprecated,
    },
    handler: async (rawRequest: RawHttpRequest, ctx?: HandlerContext): Promise<HandlerResponse> => {
      // Create context
      const rawContext: HandlerContext = options?.createContext
        ? options.createContext(rawRequest)
        : (ctx ?? { requestId: generateRequestId() });

      // Validate context (if schema defined)
      let validatedContext: unknown = rawContext;
      if (route.request.context?.schema) {
        const contextValidationResult = validateContextData(route, rawContext);
        if (!contextValidationResult.success) {
          const errors = contextValidationResult.errors ?? [];
          throw new ControllerError({
            message: 'Context validation failed',
            code: 'CONTEXT_VALIDATION_ERROR',
            cause: new Error(errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')),
          });
        }
        validatedContext = contextValidationResult.data;
      }

      // Validate request (if enabled)
      // Use internal type since specific route types are erased in this function
      let validatedRequest: ValidatedRequestInternal;

      if (shouldValidateRequest) {
        const validationResult = validateRequestData(route, rawRequest);

        if (!validationResult.success) {
          const errors = validationResult.errors ?? [];
          throw new InvalidRequestError({
            message: 'Request validation failed',
            validationErrors: errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          });
        }

        const data = validationResult.data ?? {};

        validatedRequest = {
          body: data.body,
          query: data.query,
          pathParams: data.pathParams,
          headers: data.headers,
          raw: {
            method: rawRequest.method,
            url: rawRequest.url,
            headers: normalizeHeaders(rawRequest.headers),
          },
        };
      } else {
        // Skip validation - pass through normalized data

        validatedRequest = {
          body: rawRequest.body,
          query: normalizeQuery(rawRequest.query),
          pathParams: normalizePathParams(rawRequest.params),
          headers: normalizeHeaders(rawRequest.headers),
          raw: {
            method: rawRequest.method,
            url: rawRequest.url,
            headers: normalizeHeaders(rawRequest.headers),
          },
        };
      }

      // Execute the pipeline based on handler type
      // Errors from the use case/handler propagate to the framework's error handler
      const executePipeline = async (): Promise<HandlerResponse> => {
        if (isSimpleHandlerConfig(config)) {
          // Simple handler: direct call
          return config.handler(
            validatedRequest as unknown as ValidatedRequest<RouteDefinition>,
            validatedContext as HandlerContext,
          );
        } else {
          // Use case handler: requestMapper → useCase → responseMapper
          const { requestMapper, useCase, responseMapper } = config;

          // Map request to use case input
          // Cast is safe: ValidatedRequestInternal has same shape as ValidatedRequest<TRoute>
          // Type erasure in this function requires the cast for TypeScript
          // validatedContext is typed correctly based on route's context schema
          const input = requestMapper(
            validatedRequest as unknown as ValidatedRequest<RouteDefinition>,
            validatedContext as HandlerContext,
          );

          // Execute use case
          const output = await useCase.execute(input);

          // Map output to HTTP response
          return responseMapper(output);
        }
      };

      let response: HandlerResponse;

      if (allMiddleware.length === 0) {
        response = await executePipeline();
      } else {
        // Build middleware chain
        // Note: Middleware receives the raw context before validation
        let index = 0;
        const next = async (): Promise<HandlerResponse> => {
          if (index >= allMiddleware.length) {
            return executePipeline();
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- index bounds checked above
          const mw = allMiddleware[index++]!;
          return mw(rawRequest, rawContext, next);
        };

        response = await next();
      }

      // Always validate status code (must be 100-599)
      validateStatusCode(response.status);

      // Validate response schema (if enabled)
      if (shouldValidateResponse) {
        const responseValidationResult = validateResponseData(route, response);

        if (!responseValidationResult.success) {
          const errors = responseValidationResult.errors ?? [];
          throw new ControllerError({
            message: 'Response validation failed',
            code: 'RESPONSE_VALIDATION_ERROR',
            cause: new Error(errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')),
          });
        }
      }

      return response;
    },
  };
}

/**
 * Validates request data against route schemas.
 */
function validateRequestData(
  route: RouteDefinition,
  rawRequest: RawHttpRequest,
): ValidationResultInternal {
  const errors: ValidationIssue[] = [];
  const data: {
    body?: unknown;
    query?: unknown;
    pathParams?: unknown;
    headers?: unknown;
  } = {};

  // Validate body
  if (route.request.body?.schema) {
    const result = (route.request.body.schema as SchemaAdapter).validate(rawRequest.body);
    if (result.success) {
      data.body = result.data;
    } else {
      errors.push(
        ...result.issues.map((issue) => ({
          ...issue,
          path: ['body', ...issue.path],
        })),
      );
    }
  }

  // Validate query
  if (route.request.query?.schema) {
    const queryObj = normalizeQuery(rawRequest.query);
    const result = (route.request.query.schema as SchemaAdapter).validate(queryObj);
    if (result.success) {
      data.query = result.data;
    } else {
      errors.push(
        ...result.issues.map((issue) => ({
          ...issue,
          path: ['query', ...issue.path],
        })),
      );
    }
  }

  // Validate path params
  if (route.request.params?.schema) {
    const result = (route.request.params.schema as SchemaAdapter).validate(rawRequest.params ?? {});
    if (result.success) {
      data.pathParams = result.data;
    } else {
      errors.push(
        ...result.issues.map((issue) => ({
          ...issue,
          path: ['pathParams', ...issue.path],
        })),
      );
    }
  } else {
    // Normalize raw params if no schema (ensure all values are strings)
    data.pathParams = normalizePathParams(rawRequest.params);
  }

  // Validate headers
  if (route.request.headers?.schema) {
    const headersObj = normalizeHeaders(rawRequest.headers);
    const result = (route.request.headers.schema as SchemaAdapter).validate(headersObj);
    if (result.success) {
      data.headers = result.data;
    } else {
      errors.push(
        ...result.issues.map((issue) => ({
          ...issue,
          path: ['headers', ...issue.path],
        })),
      );
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}

/**
 * Validates response data against route response schemas.
 */
function validateResponseData(
  route: RouteDefinition,
  response: HandlerResponse,
): ValidationResultInternal {
  const statusCode = String(response.status);
  const responses = route.responses as Record<string, { schema?: SchemaAdapter } | undefined>;
  const responseConfig = responses[statusCode];

  // No schema defined for this status code - skip validation
  if (!responseConfig) {
    return { success: true };
  }

  const schema = responseConfig.schema;

  // No schema in the response config - skip validation
  if (!schema) {
    return { success: true };
  }

  // Validate response body against schema
  const result = schema.validate(response.body);

  if (result.success) {
    return { success: true };
  }

  // Prefix errors with 'response.' for clarity
  const errors = result.issues.map((issue) => ({
    ...issue,
    path: ['response', ...issue.path],
  }));

  return { success: false, errors };
}

/**
 * Validates context data against route context schema.
 */
function validateContextData(
  route: RouteDefinition,
  context: HandlerContext,
): ContextValidationResultInternal {
  const contextSchema = route.request.context?.schema as SchemaAdapter | undefined;

  // No context schema defined - skip validation
  if (!contextSchema) {
    return { success: true, data: context };
  }

  // Validate context against schema
  const result = contextSchema.validate(context);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Prefix errors with 'context.' for clarity
  const errors = result.issues.map((issue) => ({
    ...issue,
    path: ['context', ...issue.path],
  }));

  return { success: false, errors };
}

interface ValidationResultInternal {
  success: boolean;
  errors?: ValidationIssue[];
  data?: {
    body?: unknown;
    query?: unknown;
    pathParams?: unknown;
    headers?: unknown;
  };
}

interface ContextValidationResultInternal {
  success: boolean;
  errors?: ValidationIssue[];
  data?: unknown;
}

/**
 * Internal validated request type with unknown fields.
 * Used inside createRouteHandler where specific types are erased.
 * The requestMapper receives the properly typed ValidatedRequest<TRoute>.
 */
interface ValidatedRequestInternal {
  readonly body: unknown;
  readonly query: unknown;
  readonly pathParams: unknown;
  readonly headers: unknown;
  readonly raw: {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
  };
}

/**
 * Validates that an HTTP status code is in the valid range (100-599).
 *
 * @throws {ControllerError} If the status code is invalid
 */
function validateStatusCode(status: number): void {
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new ControllerError({
      message: `Invalid HTTP status code: ${status}. Status must be an integer between 100 and 599.`,
      code: 'INVALID_STATUS_CODE',
    });
  }
}

/**
 * Normalizes query parameters, preserving arrays for duplicate keys.
 *
 * When a query parameter appears multiple times (e.g., `?tag=a&tag=b`),
 * the framework provides an array. This function preserves that array
 * so schema validation can properly validate array vs single-value params.
 *
 * Empty strings are allowed (e.g., `?flag=` results in `{ flag: '' }`).
 * Undefined values are filtered out from arrays.
 */
function normalizeQuery(
  query?: Record<string, string | string[] | undefined>,
): Record<string, string | string[]> {
  if (!query) return {};

  const result: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      // Filter out undefined values but preserve the array structure
      const definedValues = value.filter((v): v is string => v !== undefined);
      if (definedValues.length === 1 && definedValues[0] !== undefined) {
        // Single value in array - unwrap for convenience
        result[key] = definedValues[0];
      } else if (definedValues.length > 1) {
        // Multiple values - preserve as array for schema validation
        result[key] = definedValues;
      }
      // Empty array (all undefined) - skip this key
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Normalizes path parameters to ensure all values are non-empty strings.
 *
 * @throws {InvalidRequestError} If any path parameter is empty
 */
function normalizePathParams(params?: Record<string, string>): Record<string, string> {
  if (!params) return {};

  const result: Record<string, string> = {};
  const emptyParams: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      const stringValue = String(value);
      if (stringValue === '') {
        emptyParams.push(key);
      } else {
        result[key] = stringValue;
      }
    }
  }

  // Throw error for empty path params instead of silently filtering
  if (emptyParams.length > 0) {
    throw new InvalidRequestError({
      message: 'Path parameters cannot be empty',
      validationErrors: emptyParams.map((param) => ({
        field: `pathParams.${param}`,
        message: 'Path parameter cannot be empty',
      })),
    });
  }

  return result;
}

/**
 * Normalizes headers to a flat object.
 *
 * Per RFC 7230, multiple header values are joined with ", " (comma + space).
 * Headers are lowercased for consistency.
 */
function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      // Filter undefined values and join per RFC 7230
      const definedValues = value.filter((v): v is string => v !== undefined);
      if (definedValues.length > 0) {
        result[key.toLowerCase()] = definedValues.join(', ');
      }
    } else {
      result[key.toLowerCase()] = value;
    }
  }
  return result;
}

/**
 * Generates a unique request ID using crypto-secure UUID.
 */
function generateRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}
