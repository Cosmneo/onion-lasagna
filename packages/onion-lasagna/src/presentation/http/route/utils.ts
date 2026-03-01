/**
 * @fileoverview Route utility functions.
 *
 * @module unified/route/utils
 */

/**
 * Generates an operationId from a router key path.
 *
 * Converts dotted key paths to camelCase:
 * - `"users.list"` → `"usersList"`
 * - `"organizations.members.get"` → `"organizationsMembersGet"`
 *
 * @param key - The dotted router key path
 * @returns A camelCase operationId string
 */
export function generateOperationId(key: string): string {
  return key
    .split('.')
    .map((segment, index) =>
      index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1),
    )
    .join('');
}
