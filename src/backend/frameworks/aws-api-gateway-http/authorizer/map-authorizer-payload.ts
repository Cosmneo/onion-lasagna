import type { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Maps the authorizer payload from an API Gateway event.
 *
 * Expects the authorizer to return context with `authorizerPayload`
 * containing a JSON-encoded string (created via `createAuthorizerPayload`).
 *
 * @typeParam T - The expected type of the deserialized payload
 * @param event - The API Gateway v2 event
 * @returns The deserialized payload, or `null` if not present
 *
 * @example
 * ```typescript
 * interface MyAuthContext {
 *   userId: string;
 *   tenantId: string;
 *   roles: string[];
 *   permissions: { canRead: boolean; canWrite: boolean };
 * }
 *
 * const authContext = mapAuthorizerPayload<MyAuthContext>(event);
 * if (authContext) {
 *   console.log(authContext.userId); // '123'
 *   console.log(authContext.roles);  // ['admin', 'user']
 * }
 * ```
 */
export function mapAuthorizerPayload<T>(event: APIGatewayProxyEventV2): T | null {
  // Access authorizer via indexed access since APIGatewayProxyEventV2 doesn't
  // include authorizer in its base requestContext type
  const requestContext = event.requestContext as unknown as Record<string, unknown>;
  const authorizer = requestContext['authorizer'] as Record<string, unknown> | undefined;

  if (!authorizer || !('lambda' in authorizer)) {
    return null;
  }

  const lambda = authorizer['lambda'] as Record<string, unknown> | undefined;
  const payload = lambda?.['authorizerPayload'];

  if (!payload || typeof payload !== 'string') {
    return null;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}
