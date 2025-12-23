import type {
  APIGatewayRequestAuthorizerEventV2,
  APIGatewaySimpleAuthorizerResult,
} from 'aws-lambda';
import { generateAuthorizerResponse } from '../authorizer';

/**
 * Decorator for HTTP API v2 Authorizer handlers to apply global exception handling.
 *
 * Catches all errors thrown during authorization and returns an unauthorized
 * response (isAuthorized: false). This ensures API Gateway rejects the request
 * with 401 Unauthorized.
 *
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * class AuthorizationHandler {
 *   @WithExceptionHandlerAuthorizer()
 *   async authorize(event: APIGatewayRequestAuthorizerEventV2) {
 *     // Any error thrown here will result in unauthorized response
 *     const token = event.headers?.authorization;
 *     if (!token) {
 *       throw new Error('Missing authorization header');
 *     }
 *     const user = await validateToken(token); // May throw
 *     return generateAuthorizerResponse({
 *       isAuthorized: true,
 *       context: { userId: user.id },
 *     });
 *   }
 * }
 * ```
 */
export function WithExceptionHandlerAuthorizer() {
  return function (
    _target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void {
    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      throw new Error(
        `@WithExceptionHandlerAuthorizer can only be applied to methods, but ${String(propertyKey)} is not a function`,
      );
    }

    descriptor.value = async function (
      event: APIGatewayRequestAuthorizerEventV2,
      ...rest: unknown[]
    ): Promise<APIGatewaySimpleAuthorizerResult> {
      try {
        return await originalMethod.apply(this, [event, ...rest]);
      } catch (error: unknown) {
        // Log the error for debugging
        console.error('[AUTH] Authorizer error:', error);

        // Return unauthorized response for any error
        // This ensures API Gateway rejects the request with 401 Unauthorized
        return generateAuthorizerResponse({
          isAuthorized: false,
          context: {},
        });
      }
    };
  };
}
