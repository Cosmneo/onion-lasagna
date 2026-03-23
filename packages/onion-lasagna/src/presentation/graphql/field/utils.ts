/**
 * @fileoverview GraphQL field utility functions.
 *
 * @module graphql/field/utils
 */

/**
 * Generates a field ID from a schema key path.
 *
 * This is the **single source of truth** for the naming convention used across:
 * - SDL generation (`type Query { usersGet(...) }`)
 * - Yoga resolver map keys
 * - Client query string field names
 *
 * Converts dotted key paths to camelCase:
 * - `"users.get"` → `"usersGet"`
 * - `"projects.members.list"` → `"projectsMembersList"`
 * - `"getUser"` → `"getUser"` (single segment unchanged)
 *
 * @param key - The dotted schema key path
 * @returns A camelCase field ID string
 */
export function generateFieldId(key: string): string {
  return key
    .split('.')
    .map((segment, index) =>
      index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1),
    )
    .join('');
}
