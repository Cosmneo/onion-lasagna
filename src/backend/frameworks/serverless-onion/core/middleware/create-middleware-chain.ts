import type { Middleware } from './types/middleware.type';
import type { MiddlewareChainBuilder } from './types/middleware-chain-builder.type';

/**
 * Internal builder implementation.
 *
 * Uses a class for runtime behavior while the type system handles
 * compile-time validation of middleware dependencies.
 */
class MiddlewareChainBuilderImpl<
  TMiddlewares extends readonly unknown[],
  TAccumulatedContext extends object,
  TEnv,
  TRequest,
> implements MiddlewareChainBuilder<TMiddlewares, TAccumulatedContext, TEnv, TRequest> {
  readonly #middlewares: TMiddlewares;

  constructor(middlewares: TMiddlewares) {
    this.#middlewares = middlewares;
  }

  use<TOutput extends object, TRequired extends TAccumulatedContext>(
    middleware: Middleware<TOutput, TRequired, TEnv, TRequest>,
  ): MiddlewareChainBuilder<
    readonly [...TMiddlewares, Middleware<TOutput, TRequired, TEnv, TRequest>],
    TAccumulatedContext & TOutput,
    TEnv,
    TRequest
  > {
    // Runtime: append to the array
    // The type assertion is safe because TypeScript validates the constraint at call site
    const newMiddlewares = [...this.#middlewares, middleware] as readonly [
      ...TMiddlewares,
      Middleware<TOutput, TRequired, TEnv, TRequest>,
    ];

    return new MiddlewareChainBuilderImpl(newMiddlewares);
  }

  build(): TMiddlewares {
    return this.#middlewares;
  }

  get middlewares(): TMiddlewares {
    return this.#middlewares;
  }

  // Type-only property - provides access to accumulated context type via `typeof`
  get context(): TAccumulatedContext {
    return undefined as unknown as TAccumulatedContext;
  }
}

/**
 * Creates a type-safe middleware chain builder.
 *
 * The builder enforces that middlewares are added in the correct order
 * by validating at compile time that each middleware's required context
 * is satisfied by the accumulated context from previous middlewares.
 *
 * @typeParam TEnv - Environment/bindings type
 * @typeParam TRequest - Request type (defaults to Web API Request)
 * @returns An empty middleware chain builder
 *
 * @example Basic usage
 * ```typescript
 * interface AuthContext { userId: string; }
 * interface TenantContext { tenantId: string; }
 *
 * const chain = createMiddlewareChain<Env, Request>()
 *   .use(authMiddleware)      // Adds AuthContext
 *   .use(tenantMiddleware)    // Can access AuthContext, adds TenantContext
 *   .build();
 *
 * // Using with handler
 * const handler = createWorkerHandler({
 *   middlewares: chain,
 *   controller: myController,
 *   mapInput: (request, env, ctx) => ({
 *     userId: ctx.userId,     // Type-safe!
 *     tenantId: ctx.tenantId, // Type-safe!
 *   }),
 * });
 * ```
 *
 * @example Compile-time error for wrong order
 * ```typescript
 * // This will NOT compile:
 * const chain = createMiddlewareChain<Env>()
 *   .use(tenantMiddleware)  // Error: TenantMiddleware requires AuthContext
 *   .use(authMiddleware);   // Too late!
 *
 * // Error: Argument of type 'Middleware<TenantContext, AuthContext, Env, Request>'
 * //        is not assignable to parameter of type 'Middleware<..., object, ...>'
 * ```
 *
 * @example Extracting the context type
 * ```typescript
 * const chain = createMiddlewareChain<Env>()
 *   .use(authMiddleware)
 *   .use(tenantMiddleware);
 *
 * type MyContext = typeof chain.context;
 * // MyContext = { userId: string } & { tenantId: string }
 * ```
 */
export function createMiddlewareChain<TEnv = unknown, TRequest = Request>(): MiddlewareChainBuilder<
  readonly [],
  object,
  TEnv,
  TRequest
> {
  return new MiddlewareChainBuilderImpl<readonly [], object, TEnv, TRequest>(
    [] as unknown as readonly [],
  );
}
