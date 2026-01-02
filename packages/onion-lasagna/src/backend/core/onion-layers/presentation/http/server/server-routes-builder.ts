/**
 * @fileoverview Builder pattern for creating type-safe server routes.
 *
 * The `serverRoutes` function returns a builder that provides 100% type inference
 * for all handler parameters - no manual type annotations required.
 *
 * @module unified/server/server-routes-builder
 */

import type { RouterConfig, RouterDefinition, GetRoute, RouterKeys } from '../route/types';
import type {
  CreateServerRoutesOptions,
  HandlerResponse,
  MiddlewareFunction,
  RouteHandlerConfig,
  TypedContext,
  UnifiedRouteInput,
  UseCasePort,
  ValidatedRequest,
} from './types';
import { createServerRoutesInternal } from './create-server-routes';
import type { RouteDefinition } from '../route/types';

// ============================================================================
// Builder Types
// ============================================================================

/**
 * Error type displayed when attempting to build() with missing handlers.
 * The `___missingRoutes` property shows which routes are missing.
 */
export interface MissingHandlersError<TMissing extends string> {
  /**
   * This error indicates that not all routes have handlers.
   * Use buildPartial() to build with only the defined handlers,
   * or add handlers for the missing routes.
   */
  (options?: never): never;
  /** Routes that are missing handlers */
  readonly ___missingRoutes: TMissing;
}

/**
 * Handler configuration for the builder pattern.
 * Identical to RouteHandlerConfig but with proper TypedContext.
 */
export interface BuilderHandlerConfig<TRoute extends RouteDefinition, TInput, TOutput> {
  /**
   * Maps the validated HTTP request to use case input.
   * Both `req` and `ctx` are fully typed based on route schemas.
   */
  readonly requestMapper: (req: ValidatedRequest<TRoute>, ctx: TypedContext<TRoute>) => TInput;

  /**
   * The use case to execute.
   */
  readonly useCase: UseCasePort<TInput, TOutput>;

  /**
   * Maps the use case output to an HTTP response.
   */
  readonly responseMapper: (output: TOutput) => HandlerResponse;

  /**
   * Middleware to run before the handler.
   */
  readonly middleware?: readonly MiddlewareFunction[];
}

/**
 * Builder interface for creating type-safe server routes.
 *
 * Each `.handle()` call captures the specific route type and provides
 * full type inference for requestMapper, useCase, and responseMapper.
 *
 * @typeParam T - The router configuration type
 * @typeParam THandled - Union of route keys that have handlers (accumulates)
 *
 * @example
 * ```typescript
 * const routes = serverRoutes(projectRouter)
 *   .handle('projects.create', {
 *     requestMapper: (req, ctx) => ({
 *       name: req.body.name,      // Fully typed!
 *       createdBy: ctx.userId,    // Fully typed!
 *     }),
 *     useCase: createProjectUseCase,
 *     responseMapper: (output) => ({
 *       status: 201 as const,
 *       body: { projectId: output.projectId },
 *     }),
 *   })
 *   .handle('projects.list', { ... })
 *   .build();
 * ```
 */
export interface ServerRoutesBuilder<T extends RouterConfig, THandled extends string = never> {
  /**
   * Register a handler for a specific route.
   *
   * The key must be a valid route key that hasn't been handled yet.
   * All parameters (req, ctx, output) are fully typed based on the route definition.
   *
   * @param key - The route key (e.g., 'projects.create')
   * @param config - Handler configuration with requestMapper, useCase, responseMapper
   * @returns A new builder with the route key added to handled routes
   */
  handle<K extends Exclude<RouterKeys<T>, THandled>, TInput, TOutput>(
    key: K,
    config: BuilderHandlerConfig<GetRoute<T, K>, TInput, TOutput>,
  ): ServerRoutesBuilder<T, THandled | K>;

  /**
   * Build the routes array for framework registration.
   *
   * This method is only available when ALL routes have handlers.
   * If some routes are missing handlers, use `buildPartial()` instead.
   *
   * @param options - Optional configuration (validation, middleware)
   * @returns Array of route inputs for framework registration
   *
   * @throws {Error} At compile time if routes are missing (type error)
   */
  build: [Exclude<RouterKeys<T>, THandled>] extends [never]
    ? (options?: CreateServerRoutesOptions) => UnifiedRouteInput[]
    : MissingHandlersError<Exclude<RouterKeys<T>, THandled>>;

  /**
   * Build routes for only the defined handlers.
   *
   * Use this when you only want to register handlers for some routes,
   * not all routes in the router. No compile-time enforcement.
   *
   * @param options - Optional configuration (validation, middleware)
   * @returns Array of route inputs for framework registration
   */
  buildPartial(options?: CreateServerRoutesOptions): UnifiedRouteInput[];
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
class ServerRoutesBuilderImpl<T extends RouterConfig, THandled extends string = never> {
  private readonly router: T | RouterDefinition<T>;
  private readonly handlers: Map<string, RouteHandlerConfig<RouteDefinition, unknown, unknown>>;

  constructor(
    router: T | RouterDefinition<T>,
    handlers?: Map<string, RouteHandlerConfig<RouteDefinition, unknown, unknown>>,
  ) {
    this.router = router;
    this.handlers = handlers ?? new Map();
  }

  handle<K extends Exclude<RouterKeys<T>, THandled>, TInput, TOutput>(
    key: K,
    config: BuilderHandlerConfig<GetRoute<T, K>, TInput, TOutput>,
  ): ServerRoutesBuilder<T, THandled | K> {
    // Create new handlers map (immutable pattern)
    const newHandlers = new Map(this.handlers);
    newHandlers.set(key as string, config as RouteHandlerConfig<RouteDefinition, unknown, unknown>);

    // Return new builder with updated type
    // Cast through unknown is safe: the type system tracks THandled | K through the interface
    // The conditional type on `build` cannot be proven at compile time, hence the cast
    return new ServerRoutesBuilderImpl<T, THandled | K>(
      this.router,
      newHandlers,
    ) as unknown as ServerRoutesBuilder<T, THandled | K>;
  }

  // The build method's type is determined by the interface conditional type
  // At runtime, it always works the same way - the conditional type only affects compile-time
  build(options?: CreateServerRoutesOptions): UnifiedRouteInput[] {
    return createServerRoutesInternal(this.router, Object.fromEntries(this.handlers), options);
  }

  buildPartial(options?: CreateServerRoutesOptions): UnifiedRouteInput[] {
    return createServerRoutesInternal(this.router, Object.fromEntries(this.handlers), {
      ...options,
      allowPartial: true,
    });
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates a type-safe server routes builder for a router.
 *
 * The builder pattern provides 100% type inference for all handler parameters:
 * - `req.body`, `req.query`, `req.pathParams`, `req.headers` are typed from route schemas
 * - `ctx` is typed from the route's context schema
 * - `output` in responseMapper is typed from the use case
 *
 * @param router - Router definition or router config
 * @returns Builder for registering handlers
 *
 * @example Basic usage
 * ```typescript
 * import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
 * import { projectRouter } from './router';
 *
 * const routes = serverRoutes(projectRouter)
 *   .handle('projects.create', {
 *     requestMapper: (req, ctx) => ({
 *       name: req.body.name,
 *       createdBy: ctx.userId,
 *     }),
 *     useCase: createProjectUseCase,
 *     responseMapper: (output) => ({
 *       status: 201 as const,
 *       body: { projectId: output.projectId },
 *     }),
 *   })
 *   .handle('projects.list', {
 *     requestMapper: (req) => ({
 *       page: req.query.page ?? 1,
 *       limit: req.query.limit ?? 20,
 *     }),
 *     useCase: listProjectsUseCase,
 *     responseMapper: (output) => ({
 *       status: 200 as const,
 *       body: output.projects,
 *     }),
 *   })
 *   .build();
 *
 * // Register with framework
 * registerHonoRoutes(app, routes);
 * ```
 *
 * @example Partial build (only some routes)
 * ```typescript
 * const routes = serverRoutes(projectRouter)
 *   .handle('projects.create', { ... })
 *   // Skip other routes
 *   .buildPartial(); // No type error even with missing routes
 * ```
 *
 * @example With options
 * ```typescript
 * const routes = serverRoutes(projectRouter)
 *   .handle('projects.create', { ... })
 *   .handle('projects.list', { ... })
 *   .build({
 *     validateRequest: true,
 *     validateResponse: process.env.NODE_ENV !== 'production',
 *     middleware: [loggingMiddleware],
 *   });
 * ```
 */
export function serverRoutes<T extends RouterConfig>(
  router: T | RouterDefinition<T>,
): ServerRoutesBuilder<T, never> {
  // Cast through unknown is safe: initial builder has no handlers (THandled = never)
  return new ServerRoutesBuilderImpl(router) as unknown as ServerRoutesBuilder<T, never>;
}
