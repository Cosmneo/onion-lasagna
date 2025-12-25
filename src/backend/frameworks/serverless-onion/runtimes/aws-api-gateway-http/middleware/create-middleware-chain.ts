import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { createMiddlewareChain as createCoreMiddlewareChain } from '../../../core/middleware/create-middleware-chain';
import type { MiddlewareChainBuilder } from '../../../core/middleware/types/middleware-chain-builder.type';

/**
 * Creates a type-safe middleware chain builder for AWS Lambda.
 *
 * Pre-configured with `APIGatewayProxyEventV2` as the request type.
 *
 * @typeParam TEnv - Environment/dependencies type (defaults to undefined)
 * @returns An empty middleware chain builder
 *
 * @example
 * ```typescript
 * interface AuthContext { userId: string; }
 * interface TenantContext { tenantId: string; }
 *
 * const chain = createMiddlewareChain<Deps>()
 *   .use(authMiddleware)
 *   .use(tenantMiddleware)
 *   .build();
 *
 * const handler = createLambdaHandler({
 *   env: { db, cache },
 *   middlewares: chain,
 *   controller: myController,
 * });
 * ```
 *
 * @example Compile-time error for wrong order
 * ```typescript
 * // This will NOT compile:
 * createMiddlewareChain<Deps>()
 *   .use(tenantMiddleware)  // Error: requires AuthContext
 *   .use(authMiddleware);   // Too late!
 * ```
 */
export function createMiddlewareChain<TEnv = undefined>(): MiddlewareChainBuilder<
  readonly [],
  object,
  TEnv,
  APIGatewayProxyEventV2
> {
  return createCoreMiddlewareChain<TEnv, APIGatewayProxyEventV2>();
}
