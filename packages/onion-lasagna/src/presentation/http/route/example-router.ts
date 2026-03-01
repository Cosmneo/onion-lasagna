/**
 * @fileoverview Example router demonstrating the route API.
 *
 * Shows how to use `defineRoute` and `defineRouter` to build
 * a type-safe router structure. Uses `createPassthroughAdapter`
 * for self-contained examples — in real code, use a schema adapter
 * like `zodSchema()` from `@cosmneo/onion-lasagna-zod`.
 *
 * @example With Zod (recommended for real projects)
 * ```typescript
 * import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/http/route';
 * import { zodSchema } from '@cosmneo/onion-lasagna-zod';
 * import { z } from 'zod';
 *
 * const listUsers = defineRoute({
 *   method: 'GET',
 *   path: '/api/users',
 *   request: {
 *     query: zodSchema(z.object({
 *       page: z.coerce.number().optional().default(1),
 *       limit: z.coerce.number().optional().default(20),
 *     })),
 *   },
 *   responses: {
 *     200: { schema: zodSchema(z.object({
 *       users: z.array(z.object({ id: z.string(), name: z.string() })),
 *       total: z.number(),
 *     }))},
 *   },
 *   docs: { summary: 'List all users', tags: ['Users'] },
 * });
 *
 * const api = defineRouter({
 *   users: { list: listUsers },
 * });
 * ```
 *
 * @module unified/route/example
 */

import { createPassthroughAdapter } from '../schema/types';
import { generateOpenAPI } from '../openapi/generate';
import { defineRoute } from './define-route';
import { defineRouter, mergeRouters } from './define-router';

// ============================================================================
// Schema adapters (passthrough for demonstration)
// ============================================================================

const paginationQuery = createPassthroughAdapter<{ page: number; limit: number }>();
const userBody = createPassthroughAdapter<{ name: string; email: string }>();
const userResponse = createPassthroughAdapter<{ id: string; name: string; email: string }>();
const userListResponse = createPassthroughAdapter<{
  users: { id: string; name: string; email: string }[];
  total: number;
}>();
const taskBody = createPassthroughAdapter<{ title: string; description?: string }>();
const taskResponse = createPassthroughAdapter<{ id: string; title: string; done: boolean }>();
const taskListResponse = createPassthroughAdapter<{
  tasks: { id: string; title: string; done: boolean }[];
}>();
const authContext = createPassthroughAdapter<{ userId: string; role: 'admin' | 'user' }>();

// ============================================================================
// Route definitions
// ============================================================================

const listUsers = defineRoute({
  method: 'GET',
  path: '/api/users',
  request: {
    query: paginationQuery,
  },
  responses: {
    200: { schema: userListResponse },
  },
  docs: { summary: 'List all users' },
});

const getUser = defineRoute({
  method: 'GET',
  path: '/api/users/:userId',
  responses: {
    200: { schema: userResponse },
    404: { description: 'User not found' },
  },
  docs: { summary: 'Get a user by ID' },
});

const createUser = defineRoute({
  method: 'POST',
  path: '/api/users',
  request: {
    body: {
      schema: userBody,
      description: 'The user to create',
    },
  },
  responses: {
    201: { schema: userResponse, description: 'User created' },
    400: { description: 'Validation error' },
    409: { description: 'Email already in use' },
  },
  docs: { summary: 'Create a new user' },
});

const updateUser = defineRoute({
  method: 'PUT',
  path: '/api/users/:userId',
  request: {
    body: userBody,
  },
  responses: {
    200: { schema: userResponse },
  },
  docs: { summary: 'Update a user' },
});

const deleteUser = defineRoute({
  method: 'DELETE',
  path: '/api/users/:userId',
  responses: {
    204: { description: 'User deleted' },
    404: { description: 'User not found' },
  },
  docs: { summary: 'Delete a user' },
});

const listTasks = defineRoute({
  method: 'GET',
  path: '/api/projects/:projectId/tasks',
  request: {
    query: paginationQuery,
  },
  responses: {
    200: { schema: taskListResponse },
  },
  docs: { summary: 'List tasks for a project' },
});

const createTask = defineRoute({
  method: 'POST',
  path: '/api/projects/:projectId/tasks',
  request: {
    body: taskBody,
  },
  responses: {
    201: { schema: taskResponse, description: 'Task created' },
  },
  docs: { summary: 'Create a task' },
});

// ============================================================================
// Router definitions
// ============================================================================

/** Users router with shared tags and context */
const usersRouter = defineRouter(
  {
    list: listUsers,
    get: getUser,
    create: createUser,
    update: updateUser,
    delete: deleteUser,
  },
  {
    defaults: {
      tags: ['Users'],
      context: authContext,
    },
  },
);

/** Tasks router scoped under projects */
const tasksRouter = defineRouter(
  {
    list: listTasks,
    create: createTask,
  },
  {
    defaults: {
      tags: ['Tasks'],
      context: authContext,
    },
  },
);

// ============================================================================
// Merged API router
// ============================================================================

/**
 * Full API router composed from domain routers.
 *
 * Structure:
 * ```
 * api.routes.users.list      → GET    /api/users
 * api.routes.users.get        → GET    /api/users/:userId
 * api.routes.users.create     → POST   /api/users
 * api.routes.users.update     → PUT    /api/users/:userId
 * api.routes.users.delete     → DELETE /api/users/:userId
 * api.routes.tasks.list       → GET    /api/projects/:projectId/tasks
 * api.routes.tasks.create     → POST   /api/projects/:projectId/tasks
 * ```
 */
export const exampleRouter = mergeRouters({ users: usersRouter }, { tasks: tasksRouter });
// ============================================================================
// OpenAPI spec generation
// ============================================================================

/**
 * Generated OpenAPI 3.1 specification from the router.
 *
 * Produces a complete spec with paths, parameters, request bodies,
 * responses, tags, security schemes, and server definitions.
 */
export const openApiSpec = generateOpenAPI(exampleRouter, {
  info: {
    title: 'Example API',
    version: '1.0.0',
    description: 'A sample API demonstrating onion-lasagna route definitions.',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
    { url: 'https://api.example.com', description: 'Production' },
  ],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT Bearer token authentication',
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Users', description: 'User management operations' },
    { name: 'Tasks', description: 'Task management within projects' },
  ],
});

// ============================================================================
// Type inference examples (compile-time only)
// ============================================================================

// These are type-level checks showing what the API infers.
// Uncomment to verify in your IDE:
//
// import type { InferRouteBody, InferRouteQuery, InferRouteResponse, InferRoutePathParams } from './types';
//
// type ListQuery = InferRouteQuery<typeof listUsers>;
// //   ^? { page: number; limit: number }
//
// type CreateBody = InferRouteBody<typeof createUser>;
// //   ^? { name: string; email: string }
//
// type GetResponse = InferRouteResponse<typeof getUser>;
// //   ^? { id: string; name: string; email: string }
//
// type CreateResponse = InferRouteResponse<typeof createUser>;
// //   ^? { id: string; name: string; email: string }
//
// type DeleteResponse = InferRouteResponse<typeof deleteUser>;
// //   ^? undefined (204 has no schema)
//
// type GetParams = InferRoutePathParams<typeof getUser>;
// //   ^? { userId: string }
//
// type TaskParams = InferRoutePathParams<typeof createTask>;
// //   ^? { projectId: string }
