/**
 * @fileoverview Utility functions for event handler routing.
 *
 * @module events/handler/utils
 */

/**
 * Generates a handler ID from a dotted key path.
 *
 * Converts dot-separated keys to camelCase:
 * - `"ticket.created"` → `"ticketCreated"`
 * - `"ecosystem.member.added"` → `"ecosystemMemberAdded"`
 *
 * @param key - The dotted key path
 * @returns A camelCase handler ID
 */
export function generateHandlerId(key: string): string {
  return key.replace(/\.(\w)/g, (_, char: string) => char.toUpperCase());
}
