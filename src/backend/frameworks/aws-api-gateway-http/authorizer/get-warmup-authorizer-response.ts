import type { APIGatewaySimpleAuthorizerWithContextResult } from 'aws-lambda';
import { type AuthorizerContext, generateAuthorizerResponse } from './generate-authorizer-response';

/**
 * Returns a standard warmup response for API Gateway authorizer handlers.
 *
 * Returns an authorized response with empty context to allow the warmup
 * call to succeed. This is used in conjunction with `isWarmupCall()` to
 * handle warmup invocations from serverless-plugin-warmup.
 *
 * @returns An authorized authorizer response with empty context
 *
 * @example
 * ```typescript
 * export const handler = async (event: APIGatewayRequestAuthorizerEventV2) => {
 *   if (isWarmupCall(event)) {
 *     console.info('Authorizer Lambda is warm!');
 *     return getWarmupAuthorizerResponse();
 *   }
 *   // ... handle normal authorization
 * };
 * ```
 */
export function getWarmupAuthorizerResponse(): APIGatewaySimpleAuthorizerWithContextResult<AuthorizerContext> {
  return generateAuthorizerResponse({
    isAuthorized: true,
    context: {},
  });
}
