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
