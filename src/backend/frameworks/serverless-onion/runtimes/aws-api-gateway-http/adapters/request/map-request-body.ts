import type { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Maps AWS API Gateway v2 body to HttpRequest body format.
 *
 * - Returns `undefined` if no body exists
 * - Attempts to parse JSON, returns raw string on failure
 *
 * @param event - AWS API Gateway v2 event
 * @returns Parsed body object, raw string, or undefined
 */
export function mapRequestBody(event: APIGatewayProxyEventV2): unknown {
  if (!event.body) {
    return undefined;
  }

  try {
    return JSON.parse(event.body);
  } catch {
    // Return raw body if JSON parsing fails
    return event.body;
  }
}
