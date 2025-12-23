import type { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Maps AWS API Gateway v2 query string parameters to HttpRequest queryParams format.
 *
 * - Filters out undefined values
 * - Returns `undefined` if no query parameters exist or all are undefined
 *
 * @param event - AWS API Gateway v2 event
 * @returns Query parameters object or undefined
 */
export function mapRequestQueryParams(
  event: APIGatewayProxyEventV2,
): Record<string, string> | undefined {
  if (!event.queryStringParameters) {
    return undefined;
  }

  const filtered: Record<string, string> = {};

  for (const [key, value] of Object.entries(event.queryStringParameters)) {
    if (value !== undefined) {
      filtered[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}
