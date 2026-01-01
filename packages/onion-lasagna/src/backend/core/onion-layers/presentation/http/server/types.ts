/**
 * @fileoverview Server types for the unified route system.
 *
 * @module unified/server/types
 */

import type {
  HttpMethod,
  RouteDefinition,
  RouterConfig,
  RouterKeys,
  GetRoute,
} from '../route/types';

// ============================================================================
// Validated Request
// ============================================================================

/**
 * A validated request with typed data.
 * This is what handlers receive after validation passes.
 */
export interface ValidatedRequest<TRoute extends RouteDefinition> {
  /**
   * Validated request body.
   */
  readonly body: TRoute['_types']['body'];

  /**
   * Validated query parameters.
   */
  readonly query: TRoute['_types']['query'];

  /**
   * Validated path parameters.
   */
  readonly pathParams: TRoute['_types']['pathParams'];

  /**
   * Validated headers.
   */
  readonly headers: TRoute['_types']['headers'];

  /**
   * Raw request object for advanced use cases.
   */
  readonly raw: {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
  };
}

/**
 * Typed context based on route definition.
 * If the route defines a context schema, this will be the validated type.
 * Otherwise, it falls back to the generic HandlerContext.
 */
export type TypedContext<TRoute extends RouteDefinition> =
  TRoute['_types']['context'] extends undefined
    ? HandlerContext
    : TRoute['_types']['context'];

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Context passed to handlers.
 * Can be extended with custom context via createServerRoutes options.
 */
export interface HandlerContext {
  /**
   * Request ID for tracing.
   */
  readonly requestId?: string;

  /**
   * Additional context data.
   */
  readonly [key: string]: unknown;
}

/**
 * Response from a handler.
 */
export interface HandlerResponse<TData = unknown> {
  /**
   * HTTP status code.
   */
  readonly status: number;

  /**
   * Response body.
   */
  readonly body?: TData;

  /**
   * Response headers.
   */
  readonly headers?: Record<string, string>;
}


// ============================================================================
// Use Case Port
// ============================================================================

/**
 * Use case port interface for unified routes.
 *
 * This is a simplified version that accepts any input/output types (plain objects).
 * It's structurally compatible with `BaseInboundPort`, so existing use case
 * implementations work without changes.
 *
 * @typeParam TInput - Input type (plain object or void for no input)
 * @typeParam TOutput - Output type (plain object or void for no output)
 *
 * @example
 * ```typescript
 * // Define plain types for use case contracts
 * type CreateProjectInput = {
 *   name: string;
 *   description?: string;
 * };
 *
 * type CreateProjectOutput = {
 *   projectId: string;
 * };
 *
 * // Use case implements this interface
 * class CreateProjectUseCase implements UseCasePort<CreateProjectInput, CreateProjectOutput> {
 *   async execute(input: CreateProjectInput): Promise<CreateProjectOutput> {
 *     // ... implementation
 *     return { projectId: '...' };
 *   }
 * }
 * ```
 */
 
export interface UseCasePort<TInput = void, TOutput = void> {
  execute(input?: TInput): Promise<TOutput>;
}
 

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * Handler configuration for a single route.
 *
 * Mirrors the BaseController pattern with three components:
 * - `requestMapper`: Maps validated HTTP request to use case input
 * - `useCase`: The use case to execute
 * - `responseMapper`: Maps use case output to HTTP response
 *
 * @typeParam TRoute - The route definition type
 * @typeParam TInput - Use case input type (plain object)
 * @typeParam TOutput - Use case output type (plain object)
 *
 * @example
 * ```typescript
 * const config: RouteHandlerConfig<typeof createProjectRoute, CreateProjectInput, CreateProjectOutput> = {
 *   requestMapper: (req) => ({
 *     name: req.body.name,
 *     description: req.body.description,
 *   }),
 *   useCase: createProjectUseCase,
 *   responseMapper: (out) => ({
 *     status: 201,
 *     body: { projectId: out.projectId },
 *   }),
 * };
 * ```
 */
 
export interface RouteHandlerConfig<
  TRoute extends RouteDefinition,
  TInput = void,
  TOutput = void,
> {

  /**
   * Maps the validated HTTP request to use case input.
   * The request has already been validated by the route's schemas.
   * Context is typed based on the route's context schema (if defined).
   */
  readonly requestMapper: (req: ValidatedRequest<TRoute>, ctx: TypedContext<TRoute>) => TInput;

  /**
   * The use case to execute.
   * Can be any object with an `execute` method matching `UseCasePort`.
   */
  readonly useCase: UseCasePort<TInput, TOutput>;

  /**
   * Maps the use case output to an HTTP response.
   * Determines the status code and response body.
   */
  readonly responseMapper: (output: TOutput) => HandlerResponse;

  /**
   * Middleware to run before the handler.
   */
  readonly middleware?: readonly MiddlewareFunction[];
}

/**
 * Middleware function type.
 */
export type MiddlewareFunction = (
  request: unknown,
  context: HandlerContext,
  next: () => Promise<HandlerResponse>,
) => Promise<HandlerResponse>;

/**
 * Configuration mapping route keys to handlers.
 *
 * Each route key maps to a `RouteHandlerConfig` with:
 * - The route definition for that key (provides request/response types)
 * - User-defined input/output types for the use case
 *
 * The `TInput` and `TOutput` types are inferred from the `useCase` property,
 * so you don't need to specify them explicitly.
 */
// TInput/TOutput are user-defined per route - any is required for heterogeneous route configs
export type ServerRoutesConfig<T extends RouterConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in RouterKeys<T>]: RouteHandlerConfig<GetRoute<T, K>, any, any>;
};

/**
 * Options for creating server routes.
 */
export interface CreateServerRoutesOptions {
  /**
   * Global middleware to run before all handlers.
   */
  readonly middleware?: readonly MiddlewareFunction[];

  /**
   * Whether to validate incoming requests against route schemas.
   * When enabled, invalid requests throw InvalidRequestError.
   * @default true
   */
  readonly validateRequest?: boolean;

  /**
   * Whether to validate outgoing responses against route schemas.
   * When enabled, invalid responses throw ControllerError.
   * Useful for catching bugs and ensuring API contract compliance.
   * @default true
   */
  readonly validateResponse?: boolean;

  /**
   * Context factory to create handler context.
   */
  readonly createContext?: (rawRequest: unknown) => HandlerContext;
}

// ============================================================================
// Route Input (for framework adapters)
// ============================================================================

/**
 * Route input compatible with framework adapters.
 * This is the output of createServerRoutes.
 */
export interface UnifiedRouteInput {
  /**
   * HTTP method.
   */
  readonly method: HttpMethod;

  /**
   * URL path pattern.
   */
  readonly path: string;

  /**
   * Handler function.
   */
  readonly handler: (
    rawRequest: RawHttpRequest,
    context?: HandlerContext,
  ) => Promise<HandlerResponse>;

  /**
   * Route metadata for documentation.
   */
  readonly metadata: {
    readonly operationId?: string;
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly deprecated?: boolean;
  };
}

/**
 * Raw HTTP request from the framework.
 */
export interface RawHttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body?: unknown;
  readonly query?: Record<string, string | string[] | undefined>;
  readonly params?: Record<string, string>;
}
