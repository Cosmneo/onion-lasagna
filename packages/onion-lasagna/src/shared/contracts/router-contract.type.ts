/**
 * @fileoverview Router contract types for organizing route contracts into nested structures.
 *
 * A RouterContract groups multiple RouteContracts into a hierarchical structure,
 * enabling organized API definitions like `api.projects.create()`.
 *
 * @module router-contract
 */

import { isRouteContract, type RouteContract } from './route-contract.type';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for a router contract - a record of routes or nested routers.
 * Using an interface to avoid circular reference issues.
 *
 * @example
 * ```typescript
 * const projectRouter: RouterContractConfig = {
 *   create: createProjectContract,
 *   list: listProjectsContract,
 *   get: getProjectContract,
 *   tasks: {
 *     add: addTaskContract,
 *     list: listTasksContract,
 *   },
 * };
 * ```
 */
export interface RouterContractConfig {
  [key: string]: RouteContract | RouterContractConfig;
}

/**
 * Type guard to check if a value is a RouterContractConfig (nested router).
 */
export function isRouterContractConfig(value: unknown): value is RouterContractConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  // It's a router config if it has string keys and values are either routes or more configs
  // A RouteContract has path, method, _types - so check if it's NOT a RouteContract
  return !isRouteContract(value);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINE ROUTER CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a typed router contract from a configuration object.
 * This is a pass-through function that provides better type inference.
 *
 * @param config - The router configuration with routes and nested routers
 * @returns The same config with proper typing
 *
 * @example
 * ```typescript
 * export const projectManagementRouter = defineRouterContract({
 *   projects: defineRouterContract({
 *     create: createProjectContract,
 *     list: listProjectsContract,
 *     get: getProjectContract,
 *   }),
 *   tasks: defineRouterContract({
 *     add: addTaskContract,
 *     list: listTasksContract,
 *   }),
 * });
 *
 * // Used with client
 * const client = createTypedClient(projectManagementRouter, { baseUrl: '...' });
 * await client.projects.create({ body: { name: 'My Project' } });
 * ```
 */
export function defineRouterContract<T extends RouterContractConfig>(config: T): T {
  return config;
}
