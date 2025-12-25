import type { Middleware } from './middleware.type';

/**
 * A type-safe middleware chain builder.
 *
 * The builder enforces that middlewares are added in the correct dependency order
 * by validating at compile time that each middleware's required context is
 * satisfied by the accumulated context from previous middlewares.
 *
 * @typeParam TMiddlewares - The readonly tuple of middlewares in the chain
 * @typeParam TAccumulatedContext - The intersection of all middleware outputs
 * @typeParam TEnv - Environment/bindings type
 * @typeParam TRequest - Request type (platform-specific)
 *
 * @example
 * ```typescript
 * interface AuthContext { userId: string; }
 * interface TenantContext { tenantId: string; }
 *
 * const chain = createMiddlewareChain<Env>()
 *   .use(authMiddleware)      // Context: {} → { userId }
 *   .use(tenantMiddleware)    // Context: { userId } → { userId, tenantId }
 *   .build();
 *
 * // Compile error if wrong order:
 * createMiddlewareChain<Env>()
 *   .use(tenantMiddleware)    // Error: requires AuthContext
 *   .use(authMiddleware);     // Too late!
 * ```
 */
export interface MiddlewareChainBuilder<
  TMiddlewares extends readonly unknown[],
  TAccumulatedContext extends object,
  TEnv,
  TRequest,
> {
  /**
   * Adds a middleware to the chain.
   *
   * The middleware's required context (`TRequired`) must be assignable to the
   * current accumulated context. If not, TypeScript will produce a compile error.
   *
   * @typeParam TOutput - The context type this middleware produces
   * @typeParam TRequired - The context type this middleware requires (must extend TAccumulatedContext)
   * @param middleware - The middleware to add to the chain
   * @returns A new builder with the updated middleware tuple and accumulated context
   *
   * @example
   * ```typescript
   * // Adding a middleware that requires AuthContext
   * const chain = createMiddlewareChain<Env>()
   *   .use(authMiddleware)        // OK: requires object (no dependencies)
   *   .use(tenantMiddleware);     // OK: requires AuthContext, which is now available
   *
   * // This fails at compile time:
   * createMiddlewareChain<Env>()
   *   .use(tenantMiddleware);     // Error: AuthContext is not assignable to object
   * ```
   */
  use<TOutput extends object, TRequired extends TAccumulatedContext>(
    middleware: Middleware<TOutput, TRequired, TEnv, TRequest>,
  ): MiddlewareChainBuilder<
    readonly [...TMiddlewares, Middleware<TOutput, TRequired, TEnv, TRequest>],
    TAccumulatedContext & TOutput,
    TEnv,
    TRequest
  >;

  /**
   * Finalizes the chain and returns the readonly middleware tuple.
   *
   * The returned tuple is compatible with handler factory configs
   * (e.g., `createLambdaHandler`, `createWorkerHandler`).
   *
   * @returns The readonly middleware tuple
   *
   * @example
   * ```typescript
   * const middlewares = createMiddlewareChain<Env>()
   *   .use(authMiddleware)
   *   .use(tenantMiddleware)
   *   .build();
   *
   * const handler = createWorkerHandler({
   *   middlewares,
   *   controller: myController,
   * });
   * ```
   */
  build(): TMiddlewares;

  /**
   * Direct access to the middleware tuple (alias for `build()`).
   *
   * Useful when you want to pass the chain directly without calling `build()`.
   */
  readonly middlewares: TMiddlewares;

  /**
   * Type-only property to access the accumulated context type.
   *
   * Use with `typeof` to extract the context type for external use.
   *
   * @example
   * ```typescript
   * const chain = createMiddlewareChain<Env>()
   *   .use(authMiddleware)
   *   .use(tenantMiddleware);
   *
   * type MyContext = typeof chain.context;
   * // MyContext = { userId: string } & { tenantId: string }
   * ```
   */
  readonly context: TAccumulatedContext;
}

/**
 * An empty middleware chain builder (starting point).
 *
 * @typeParam TEnv - Environment/bindings type
 * @typeParam TRequest - Request type
 */
export type EmptyMiddlewareChainBuilder<TEnv, TRequest> = MiddlewareChainBuilder<
  readonly [],
  object,
  TEnv,
  TRequest
>;
