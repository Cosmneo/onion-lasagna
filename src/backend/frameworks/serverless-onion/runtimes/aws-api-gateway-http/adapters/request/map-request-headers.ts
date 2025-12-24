import type { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Maps AWS API Gateway v2 headers to HttpRequest headers format.
 *
 * - Filters out undefined values
 * - Returns `undefined` if no headers exist or all are undefined
 *
 * @param event - AWS API Gateway v2 event
 * @returns Headers object or undefined
 */
export function mapRequestHeaders(
  event: APIGatewayProxyEventV2,
): Record<string, string> | undefined {
  if (!event.headers) {
    return undefined;
  }

  const filtered: Record<string, string> = {};

  for (const [key, value] of Object.entries(event.headers)) {
    if (value !== undefined) {
      filtered[key] = value;
    }
  }

  return Object.keys(filtered).length > 0 ? filtered : undefined;
}
