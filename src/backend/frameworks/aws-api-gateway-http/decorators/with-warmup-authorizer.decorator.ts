import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerResult,
} from 'aws-lambda';
import { getWarmupAuthorizerResponse } from '../authorizer';
import { isWarmupCall } from '../warmup';

/**
 * Decorator for HTTP API v2 Authorizer handlers that short-circuits warmup calls.
 *
 * When a warmup call from serverless-plugin-warmup is detected, this decorator
 * immediately returns an authorized response without executing the actual
 * authorization logic.
 *
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class AuthorizationHandler {
 *   @WithWarmupAuthorizer()
 *   async authorize(event: APIGatewayRequestAuthorizerEventV2) {
 *     // This won't execute for warmup calls
 *     const token = event.headers?.authorization;
 *     const user = await validateToken(token);
 *     return generateAuthorizerResponse({
 *       isAuthorized: !!user,
 *       context: { userId: user.id },
 *     });
 *   }
 * }
 * ```
 */
export function WithWarmupAuthorizer() {
  return function (
    _target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      throw new Error(
        `@WithWarmupAuthorizer can only be applied to methods, but ${String(propertyKey)} is not a function`,
      );
    }

    descriptor.value = async function (
      event: APIGatewayRequestAuthorizerEventV2,
      ...rest: unknown[]
    ): Promise<APIGatewaySimpleAuthorizerResult> {
      if (isWarmupCall(event)) {
        console.info('[AUTH] WarmUp - Authorizer Lambda is warm!');
        return getWarmupAuthorizerResponse();
      }
      return originalMethod.apply(this, [event, ...rest]);
    };
  };
}
