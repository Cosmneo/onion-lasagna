/**
 * Checks if a field has changed by comparing the current value with a new value.
 * - For partial updates: if newValue is undefined, treat as "no change".
 * - For full updates: compare even when newValue is undefined.
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
  return value !== (newValue as T);
}
