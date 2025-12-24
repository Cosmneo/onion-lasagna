/**
 * Creates the authorizer payload for use in `generateAuthorizerResponse`.
 *
 * Since API Gateway authorizer context only supports primitive types
 * (`string | number | boolean`), this utility serializes complex objects
 * to a JSON string under the `authorizerPayload` key.
 *
 * Use with `mapAuthorizerPayload` in handlers to deserialize.
 *
 * @param data - The data to serialize
 * @returns Object with `authorizerPayload` key containing JSON string
 *
 * @example
 * ```typescript
 * return generateAuthorizerResponse({
 *   isAuthorized: true,
 *   context: createAuthorizerPayload({
 *     userId: '123',
 *     tenantId: 'tenant-abc',
 *     roles: ['admin', 'user'],
 *     permissions: { canRead: true, canWrite: true },
 *   }),
 * });
 * ```
 */
export function createAuthorizerPayload<T extends Record<string, unknown>>(
  data: T,
): { authorizerPayload: string } {
  return {
    authorizerPayload: JSON.stringify(data),
  };
}
