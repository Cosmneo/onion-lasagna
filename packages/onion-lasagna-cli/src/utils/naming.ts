/**
 * Convert kebab-case to PascalCase
 * e.g., "user-management" -> "UserManagement"
 */
export function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert kebab-case to camelCase
 * e.g., "create-user" -> "createUser"
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert PascalCase or camelCase to kebab-case
 * e.g., "UserManagement" -> "user-management"
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}
