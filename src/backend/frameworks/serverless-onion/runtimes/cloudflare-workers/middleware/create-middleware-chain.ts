import { createMiddlewareChain as createCoreMiddlewareChain } from '../../../core/middleware/create-middleware-chain';
import type { MiddlewareChainBuilder } from '../../../core/middleware/types/middleware-chain-builder.type';
import type { WorkerEnv } from '../types';

/**
 * Creates a type-safe middleware chain builder for Cloudflare Workers.
 *
 * Pre-configured with Web API `Request` as the request type.
 *
 * @typeParam TEnv - Environment bindings type (extends WorkerEnv)
 * @returns An empty middleware chain builder
 *
 * @example
 * ```typescript
 * interface Env extends WorkerEnv {
 *   MY_KV: KVNamespace;
 *   AUTH_SECRET: string;
 * }
 *
 * interface AuthContext { userId: string; }
 * interface TenantContext { tenantId: string; }
 *
 * const chain = createMiddlewareChain<Env>()
 *   .use(authMiddleware)
 *   .use(tenantMiddleware)
 *   .build();
 *
 * const handler = createWorkerHandler({
 *   middlewares: chain,
 *   controller: myController,
 * });
 *
 * export default { fetch: handler };
 * ```
 *
 * @example Compile-time error for wrong order
 * ```typescript
 * // This will NOT compile:
 * createMiddlewareChain<Env>()
 *   .use(tenantMiddleware)  // Error: requires AuthContext
 *   .use(authMiddleware);   // Too late!
 * ```
 */
export function createMiddlewareChain<TEnv extends WorkerEnv = WorkerEnv>(): MiddlewareChainBuilder<
  readonly [],
  object,
  TEnv,
  Request
> {
  return createCoreMiddlewareChain<TEnv, Request>();
}
