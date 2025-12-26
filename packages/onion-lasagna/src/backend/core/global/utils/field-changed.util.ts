/**
 * Checks if a field has changed by comparing the current value with a new value.
 *
 * Useful for detecting changes in update operations, supporting both partial
 * and full update semantics.
 *
 * **Modes:**
 * - **Partial update** (default): `undefined` means "keep existing value" (no change)
 * - **Full update**: `undefined` means "set to undefined" (is a change if value !== undefined)
 *
 * **Limitation:** Uses strict equality (`!==`) for comparison, which only works
 * correctly for primitives and reference equality. For objects or arrays, this
 * compares references, not content. Two objects with identical content but
 * different references will be considered "changed".
 *
 * For complex objects, either:
 * - Compare by a unique identifier (e.g., `value.id !== newValue?.id`)
 * - Use value objects with `.equals()` methods
 * - Implement deep equality checking in your update logic
 *
 * @typeParam T - The type of the field being compared
 * @param options - Comparison options
 * @param options.value - The current field value
 * @param options.newValue - The incoming value (may be undefined)
 * @param options.partialUpdate - Whether to use partial update semantics (default: true)
 * @returns `true` if the field has changed, `false` otherwise
 *
 * @example Partial update (PATCH semantics)
 * ```typescript
 * // undefined means "don't change"
 * fieldChanged({ value: 'John', newValue: undefined }); // false
 * fieldChanged({ value: 'John', newValue: 'Jane' });    // true
 * fieldChanged({ value: 'John', newValue: 'John' });    // false
 * ```
 *
 * @example Full update (PUT semantics)
 * ```typescript
 * // undefined means "set to undefined"
 * fieldChanged({ value: 'John', newValue: undefined, partialUpdate: false }); // true
 * ```
 *
 * @example Object comparison (reference-based)
 * ```typescript
 * const obj1 = { name: 'John' };
 * const obj2 = { name: 'John' };
 * fieldChanged({ value: obj1, newValue: obj2 });   // true (different references)
 * fieldChanged({ value: obj1, newValue: obj1 });   // false (same reference)
 * ```
 */
export function fieldChanged<T>({
  value,
  newValue,
  partialUpdate = true,
}: {
  value: T;
  newValue: T | undefined;
  partialUpdate?: boolean;
}): boolean {
  if (partialUpdate && newValue === undefined) return false;
  // For full updates, undefined means "set to undefined" which is a change if value !== undefined
  return value !== newValue;
}
