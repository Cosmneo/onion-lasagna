/**
 * Project Management HTTP Client
 *
 * Provides a fully typed HTTP client for consuming the Project Management API.
 * Types are automatically inferred from the backend DTOs, ensuring type-safety
 * and auto-sync when DTOs change.
 *
 * @example
 * ```typescript
 * import { createProjectManagementClient } from '@repo/backend/bounded-contexts/project-management';
 *
 * const client = createProjectManagementClient({
 *   baseUrl: 'http://localhost:3000',
 * });
 *
 * // Create a new project (types are inferred!)
 * const result = await client.projects.create({
 *   body: { name: 'My Project', description: 'A test project' }
 * });
 * console.log(result.projectId); // Type-safe!
 *
 * // List all projects
 * const projects = await client.projects.list({
 *   queryParams: { page: '1', pageSize: '10' }
 * });
 *
 * // Add a task to a project
 * const task = await client.tasks.add({
 *   pathParams: { projectId: 'proj-123' },
 *   body: { title: 'My Task' }
 * });
 * ```
 */

import {
  createTypedClient,
  type TypedClientConfig,
} from '@cosmneo/onion-lasagna/client';
import { projectManagementRouter } from './typed-routes';

// Re-export the router for advanced use cases
export { projectManagementRouter } from './typed-routes';

// Re-export individual routes for granular access
export {
  createProjectRoute,
  listProjectsRoute,
  getProjectRoute,
  updateProjectRoute,
  deleteProjectRoute,
  addStatusRoute,
  listStatusesRoute,
  updateStatusRoute,
  deleteStatusRoute,
  addTaskRoute,
  listTasksRoute,
  getTaskRoute,
  updateTaskRoute,
  moveTaskRoute,
  deleteTaskRoute,
  listTasksByStatusRoute,
} from './typed-routes';

// Re-export client types for consumers
export type {
  TypedClientConfig,
  ClientError,
  CacheConfig,
  RetryConfig,
} from '@cosmneo/onion-lasagna/client';

/**
 * Creates a typed HTTP client for the Project Management API.
 *
 * @param config - Client configuration options
 * @returns A fully typed client with methods matching the API routes
 *
 * @example
 * ```typescript
 * const client = createProjectManagementClient({
 *   baseUrl: 'http://localhost:3000',
 *   headers: { Authorization: 'Bearer token' },
 *   timeout: 30000,
 *   retry: { attempts: 3, delay: 1000 },
 * });
 * ```
 */
export function createProjectManagementClient(config?: TypedClientConfig) {
  return createTypedClient(projectManagementRouter, config);
}

/**
 * Type of the Project Management client instance
 */
export type ProjectManagementClient = ReturnType<typeof createProjectManagementClient>;
