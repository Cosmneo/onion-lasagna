import type { APIGatewayProxyEventV2, APIGatewayRequestAuthorizerEventV2 } from 'aws-lambda';

interface WarmupEvent {
  source: 'serverless-plugin-warmup';
}

/**
 * Checks if the lambda invocation is a warmup call from serverless-plugin-warmup.
 *
 * Works for both API Gateway proxy events and authorizer events by checking:
 * 1. Direct warmup event: `{ source: 'serverless-plugin-warmup' }`
 * 2. Wrapped warmup event: Body contains `{ source: 'serverless-plugin-warmup' }`
 *
 * @param event - The API Gateway v2 event, authorizer event, or warmup event
 * @returns true if this is a warmup call, false otherwise
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
export function isWarmupCall(
  event: APIGatewayProxyEventV2 | APIGatewayRequestAuthorizerEventV2 | WarmupEvent | unknown,
): boolean {
  const eventRecord = event as Record<string, unknown>;

  // Check if the event source is serverless-plugin-warmup (direct warmup event)
  if (eventRecord?.['source'] === 'serverless-plugin-warmup') {
    return true;
  }

  // Check if the body contains the warmup source (API Gateway wrapped event)
  const body = eventRecord?.['body'];
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (parsed?.['source'] === 'serverless-plugin-warmup') {
        return true;
      }
    } catch {
      // Body is not valid JSON, not a warmup call
    }
  }

  return false;
}
