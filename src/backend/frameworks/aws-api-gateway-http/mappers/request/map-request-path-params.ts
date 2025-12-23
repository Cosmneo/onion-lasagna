import type { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Maps AWS API Gateway v2 path parameters to HttpRequest pathParams format.
 *
 * - Filters out undefined values
 * - Returns `undefined` if no path parameters exist or all are undefined
 *
 * @param event - AWS API Gateway v2 event
 * @returns Path parameters object or undefined
 */
export function mapRequestPathParams(
  event: APIGatewayProxyEventV2,
): Record<string, string> | undefined {
  if (!event.pathParameters) {
    return undefined;
  }

  const filtered: Record<string, string> = {};

  for (const [key, value] of Object.entries(event.pathParameters)) {
    if (value !== undefined) {
      filtered[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}
