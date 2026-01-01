/**
 * Typed HTTP Routes for Project Management Bounded Context
 *
 * This file defines route contracts that can be used with the typed HTTP client.
 * The routes automatically infer request/response types from the existing DTOs.
 */

import {
  defineRouteContract,
  defineRouterContract,
} from '@cosmneo/onion-lasagna/client';

// Project DTOs
import type {
  CreateProjectRequestData,
  CreateProjectResponseData,
} from '../presentation/http/projects/create-project/dtos';
import type {
  ListProjectsRequestData,
  ListProjectsResponseData,
} from '../presentation/http/projects/list-projects/dtos';
import type {
  GetProjectRequestData,
  GetProjectResponseData,
} from '../presentation/http/projects/get-project/dtos';
import type {
  UpdateProjectRequestData,
  UpdateProjectResponseData,
} from '../presentation/http/projects/update-project/dtos';
import type {
  DeleteProjectRequestData,
  DeleteProjectResponseData,
} from '../presentation/http/projects/delete-project/dtos';

// Status DTOs
import type {
  AddStatusRequestData,
  AddStatusResponseData,
} from '../presentation/http/projects/statuses/add-status/dtos';
import type {
  ListStatusesRequestData,
  ListStatusesResponseData,
} from '../presentation/http/projects/statuses/list-statuses/dtos';
import type {
  UpdateStatusRequestData,
  UpdateStatusResponseData,
} from '../presentation/http/projects/statuses/update-status/dtos';
import type {
  DeleteStatusRequestData,
  DeleteStatusResponseData,
} from '../presentation/http/projects/statuses/delete-status/dtos';

// Task DTOs
import type {
  AddTaskRequestData,
  AddTaskResponseData,
} from '../presentation/http/projects/tasks/add-task/dtos';
import type {
  ListTasksRequestData,
  ListTasksResponseData,
} from '../presentation/http/projects/tasks/list-tasks/dtos';
import type {
  GetTaskRequestData,
  GetTaskResponseData,
} from '../presentation/http/projects/tasks/get-task/dtos';
import type {
  UpdateTaskRequestData,
  UpdateTaskResponseData,
} from '../presentation/http/projects/tasks/update-task/dtos';
import type {
  MoveTaskRequestData,
  MoveTaskResponseData,
} from '../presentation/http/projects/tasks/move-task/dtos';
import type {
  DeleteTaskRequestData,
  DeleteTaskResponseData,
} from '../presentation/http/projects/tasks/delete-task/dtos';
import type {
  ListTasksByStatusRequestData,
  ListTasksByStatusResponseData,
} from '../presentation/http/projects/tasks/list-tasks-by-status/dtos';

// ============================================================================
// Project Routes
// ============================================================================

export const createProjectRoute = defineRouteContract<
  '/api/projects',
  'POST',
  CreateProjectRequestData,
  CreateProjectResponseData
>({
  path: '/api/projects',
  method: 'POST',
});

export const listProjectsRoute = defineRouteContract<
  '/api/projects',
  'GET',
  ListProjectsRequestData,
  ListProjectsResponseData
>({
  path: '/api/projects',
  method: 'GET',
});

export const getProjectRoute = defineRouteContract<
  '/api/projects/{projectId}',
  'GET',
  GetProjectRequestData,
  GetProjectResponseData
>({
  path: '/api/projects/{projectId}',
  method: 'GET',
});

export const updateProjectRoute = defineRouteContract<
  '/api/projects/{projectId}',
  'PATCH',
  UpdateProjectRequestData,
  UpdateProjectResponseData
>({
  path: '/api/projects/{projectId}',
  method: 'PATCH',
});

export const deleteProjectRoute = defineRouteContract<
  '/api/projects/{projectId}',
  'DELETE',
  DeleteProjectRequestData,
  DeleteProjectResponseData
>({
  path: '/api/projects/{projectId}',
  method: 'DELETE',
});

// ============================================================================
// Status Routes
// ============================================================================

export const addStatusRoute = defineRouteContract<
  '/api/projects/{projectId}/statuses',
  'POST',
  AddStatusRequestData,
  AddStatusResponseData
>({
  path: '/api/projects/{projectId}/statuses',
  method: 'POST',
});

export const listStatusesRoute = defineRouteContract<
  '/api/projects/{projectId}/statuses',
  'GET',
  ListStatusesRequestData,
  ListStatusesResponseData
>({
  path: '/api/projects/{projectId}/statuses',
  method: 'GET',
});

export const updateStatusRoute = defineRouteContract<
  '/api/projects/{projectId}/statuses/{statusId}',
  'PATCH',
  UpdateStatusRequestData,
  UpdateStatusResponseData
>({
  path: '/api/projects/{projectId}/statuses/{statusId}',
  method: 'PATCH',
});

export const deleteStatusRoute = defineRouteContract<
  '/api/projects/{projectId}/statuses/{statusId}',
  'DELETE',
  DeleteStatusRequestData,
  DeleteStatusResponseData
>({
  path: '/api/projects/{projectId}/statuses/{statusId}',
  method: 'DELETE',
});

// ============================================================================
// Task Routes
// ============================================================================

export const addTaskRoute = defineRouteContract<
  '/api/projects/{projectId}/tasks',
  'POST',
  AddTaskRequestData,
  AddTaskResponseData
>({
  path: '/api/projects/{projectId}/tasks',
  method: 'POST',
});

export const listTasksRoute = defineRouteContract<
  '/api/projects/{projectId}/tasks',
  'GET',
  ListTasksRequestData,
  ListTasksResponseData
>({
  path: '/api/projects/{projectId}/tasks',
  method: 'GET',
});

export const getTaskRoute = defineRouteContract<
  '/api/projects/{projectId}/tasks/{taskId}',
  'GET',
  GetTaskRequestData,
  GetTaskResponseData
>({
  path: '/api/projects/{projectId}/tasks/{taskId}',
  method: 'GET',
});

export const updateTaskRoute = defineRouteContract<
  '/api/projects/{projectId}/tasks/{taskId}',
  'PATCH',
  UpdateTaskRequestData,
  UpdateTaskResponseData
>({
  path: '/api/projects/{projectId}/tasks/{taskId}',
  method: 'PATCH',
});

export const moveTaskRoute = defineRouteContract<
  '/api/projects/{projectId}/tasks/{taskId}/move',
  'PATCH',
  MoveTaskRequestData,
  MoveTaskResponseData
>({
  path: '/api/projects/{projectId}/tasks/{taskId}/move',
  method: 'PATCH',
});

export const deleteTaskRoute = defineRouteContract<
  '/api/projects/{projectId}/tasks/{taskId}',
  'DELETE',
  DeleteTaskRequestData,
  DeleteTaskResponseData
>({
  path: '/api/projects/{projectId}/tasks/{taskId}',
  method: 'DELETE',
});

export const listTasksByStatusRoute = defineRouteContract<
  '/api/projects/{projectId}/tasks/by-status/{statusId}',
  'GET',
  ListTasksByStatusRequestData,
  ListTasksByStatusResponseData
>({
  path: '/api/projects/{projectId}/tasks/by-status/{statusId}',
  method: 'GET',
});

// ============================================================================
// Router Definition
// ============================================================================

/**
 * Project Management API Router
 *
 * Organizes all routes in a hierarchical structure:
 * - projects: CRUD operations for projects
 * - statuses: Status management within projects
 * - tasks: Task management within projects
 */
export const projectManagementRouter = defineRouterContract({
  projects: defineRouterContract({
    create: createProjectRoute,
    list: listProjectsRoute,
    get: getProjectRoute,
    update: updateProjectRoute,
    delete: deleteProjectRoute,
  }),
  statuses: defineRouterContract({
    add: addStatusRoute,
    list: listStatusesRoute,
    update: updateStatusRoute,
    delete: deleteStatusRoute,
  }),
  tasks: defineRouterContract({
    add: addTaskRoute,
    list: listTasksRoute,
    get: getTaskRoute,
    update: updateTaskRoute,
    move: moveTaskRoute,
    delete: deleteTaskRoute,
    listByStatus: listTasksByStatusRoute,
  }),
});
