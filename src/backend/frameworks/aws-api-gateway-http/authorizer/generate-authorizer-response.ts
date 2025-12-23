import type { APIGatewaySimpleAuthorizerWithContextResult } from 'aws-lambda';

/**
 * Context data type that can be passed to downstream Lambda functions.
 */
export type AuthorizerContext = Record<string, string | number | boolean>;

/**
 * Options for generating an authorizer response.
 */
export interface GenerateAuthorizerResponseOptions {
  /**
   * Whether the request is authorized.
   */
  isAuthorized: boolean;

  /**
   * Context data to pass to the downstream Lambda function.
   * This data will be available in `event.requestContext.authorizer.lambda`.
   */
  context: AuthorizerContext;
}

/**
 * Generates a simple authorizer response for API Gateway HTTP API v2.
 *
 * This function creates the response format expected by API Gateway's
 * Lambda authorizer for HTTP APIs. The context data will be available
 * in the downstream Lambda function's event.
 *
 * @param options - Configuration options for the authorizer response
 * @returns An API Gateway simple authorizer result
 *
 * @example
 * ```typescript
 * // Authorized response with user context
 * return generateAuthorizerResponse({
 *   isAuthorized: true,
 *   context: {
 *     userId: '123',
 *     role: 'admin',
 *     tenantId: 'tenant-abc',
 *   },
 * });
 *
 * // Denied response
 * return generateAuthorizerResponse({
 *   isAuthorized: false,
 *   context: {},
 * });
 * ```
 */
export function generateAuthorizerResponse({
  isAuthorized,
  context,
}: GenerateAuthorizerResponseOptions): APIGatewaySimpleAuthorizerWithContextResult<AuthorizerContext> {
  return {
    isAuthorized,
    context,
  };
}
