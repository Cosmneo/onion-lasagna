import type { APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * Returns a standard warmup response for API Gateway proxy handlers.
 *
 * This response indicates that the Lambda function is warm and ready
 * to handle requests. Used in conjunction with `isWarmupCall()`.
 *
 * @returns APIGatewayProxyResultV2 with 200 status and warmup message
 *
 * @example
 * ```typescript
 * export const handler = async (event: APIGatewayProxyEventV2) => {
 *   if (isWarmupCall(event)) {
 *     return getWarmupResponse();
 *   }
 *   // ... handle normal request
 * };
 * ```
 */
export function getWarmupResponse(): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Lambda is warm!' }),
  };
}
