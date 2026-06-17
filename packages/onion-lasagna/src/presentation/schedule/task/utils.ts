/**
 * @fileoverview Utility functions for scheduled task routing.
 *
 * @module schedule/task/utils
 */

/**
 * Generates a task ID from a dotted key path.
 *
 * Converts dot-separated keys to camelCase:
 * - `"billing.reconcile"` → `"billingReconcile"`
 * - `"reports.weekly.digest"` → `"reportsWeeklyDigest"`
 *
 * @param key - The dotted key path
 * @returns A camelCase task ID
 */
export function generateTaskId(key: string): string {
  return key.replace(/\.(\w)/g, (_, char: string) => char.toUpperCase());
}
