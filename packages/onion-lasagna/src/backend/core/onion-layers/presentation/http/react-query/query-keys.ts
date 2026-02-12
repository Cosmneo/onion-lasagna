/**
 * @fileoverview Query key generation for React Query integration.
 *
 * Builds hierarchical query keys from router configuration.
 * Pure functions with no React dependency.
 *
 * @module unified/react-query/query-keys
 */

import type { RouterConfig, RouterDefinition } from '../route/types';
import { isRouteDefinition, isRouterDefinition } from '../route/types';

/**
 * Checks whether an input object is "empty" (no meaningful properties).
 * Empty objects should not be appended to query keys.
 */
function isEmptyInput(input: unknown): boolean {
  if (input === undefined || input === null) return true;
  if (typeof input !== 'object') return false;
  return Object.keys(input as Record<string, unknown>).length === 0;
}

/**
 * Builds query key functions from a router configuration.
 *
 * Each route gets a callable function that returns a key array.
 * Each namespace (nested router) gets a callable function with child properties.
 *
 * @param routes - Router config or router definition
 * @param parentPath - Key segments accumulated from parent routers
 * @returns Query key object matching the router structure
 *
 * @example
 * ```typescript
 * const keys = buildQueryKeys(router);
 * keys.users()                                        // ['users']
 * keys.users.list()                                   // ['users', 'list']
 * keys.users.get({ pathParams: { userId: '123' } })   // ['users', 'get', { pathParams: { userId: '123' } }]
 * ```
 */
export function buildQueryKeys<T extends RouterConfig>(
  routes: T | RouterDefinition<T>,
  parentPath: readonly string[] = [],
): Record<string, unknown> {
  const config = isRouterDefinition(routes) ? routes.routes : routes;
  return buildQueryKeysFromConfig(config, parentPath);
}

/**
 * Recursively builds query key functions from a router config object.
 */
function buildQueryKeysFromConfig(
  config: RouterConfig,
  parentPath: readonly string[],
): Record<string, unknown> {
  const keys: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    const currentPath = [...parentPath, key];

    if (isRouteDefinition(value)) {
      // Leaf route → callable function returning key array
      keys[key] = createRouteKeyFn(currentPath);
    } else if (isRouterDefinition(value)) {
      // Nested router definition → namespace with children
      keys[key] = createNamespaceKeyFn(currentPath, value.routes);
    } else if (typeof value === 'object' && value !== null) {
      // Plain object (nested routes) → namespace with children
      keys[key] = createNamespaceKeyFn(currentPath, value as RouterConfig);
    }
  }

  return keys;
}

/**
 * Creates a key function for a leaf route.
 * Returns the path segments, optionally with input appended.
 */
function createRouteKeyFn(path: readonly string[]): (input?: unknown) => readonly unknown[] {
  return (input?: unknown) => {
    if (isEmptyInput(input)) {
      return path;
    }
    return [...path, input];
  };
}

/**
 * Creates a namespace key function that is both callable and has child properties.
 * Calling it returns the prefix path for partial cache invalidation.
 */
function createNamespaceKeyFn(
  path: readonly string[],
  childRoutes: RouterConfig,
): (() => readonly string[]) & Record<string, unknown> {
  const fn = () => path;
  const children = buildQueryKeysFromConfig(childRoutes, path);
  return Object.assign(fn, children);
}
