import type { RouteInput, HttpRequest } from "@cosmneo/onion-lasagna/backend/core/presentation";
import { computeRoutePath } from "@cosmneo/onion-lasagna/backend/core/presentation";
import {
  createProjectRequestValidator,
  listProjectsRequestValidator,
  getProjectRequestValidator,
  updateProjectRequestValidator,
  deleteProjectRequestValidator,
  addStatusRequestValidator,
  listStatusesRequestValidator,
  updateStatusRequestValidator,
  deleteStatusRequestValidator,
  addTaskRequestValidator,
  listTasksRequestValidator,
  getTaskRequestValidator,
  updateTaskRequestValidator,
  moveTaskRequestValidator,
  deleteTaskRequestValidator,
  listTasksByStatusRequestValidator,
} from "./validators.bootstrap";

// Service metadata
import { projectManagementServiceMetadata } from "../presentation/http/service.metadata";

// Projects resource
import { projectsResourceMetadata } from "../presentation/http/projects/route.metadata";
import { createProjectEndpointMetadata } from "../presentation/http/projects/create-project/endpoint.metadata";
import { listProjectsEndpointMetadata } from "../presentation/http/projects/list-projects/endpoint.metadata";
import { getProjectEndpointMetadata } from "../presentation/http/projects/get-project/endpoint.metadata";
import { updateProjectEndpointMetadata } from "../presentation/http/projects/update-project/endpoint.metadata";
import { deleteProjectEndpointMetadata } from "../presentation/http/projects/delete-project/endpoint.metadata";
import {
  CreateProjectRequestDto,
  type CreateProjectRequestData,
} from "../presentation/http/projects/create-project/dtos";
import {
  ListProjectsRequestDto,
  type ListProjectsRequestData,
} from "../presentation/http/projects/list-projects/dtos";
import {
  GetProjectRequestDto,
  type GetProjectRequestData,
} from "../presentation/http/projects/get-project/dtos";
import {
  UpdateProjectRequestDto,
  type UpdateProjectRequestData,
} from "../presentation/http/projects/update-project/dtos";
import {
  DeleteProjectRequestDto,
  type DeleteProjectRequestData,
} from "../presentation/http/projects/delete-project/dtos";

// Statuses resource
import { statusesResourceMetadata } from "../presentation/http/projects/statuses/route.metadata";
import { addStatusEndpointMetadata } from "../presentation/http/projects/statuses/add-status/endpoint.metadata";
import { listStatusesEndpointMetadata } from "../presentation/http/projects/statuses/list-statuses/endpoint.metadata";
import { updateStatusEndpointMetadata } from "../presentation/http/projects/statuses/update-status/endpoint.metadata";
import { deleteStatusEndpointMetadata } from "../presentation/http/projects/statuses/delete-status/endpoint.metadata";
import {
  AddStatusRequestDto,
  type AddStatusRequestData,
} from "../presentation/http/projects/statuses/add-status/dtos";
import {
  ListStatusesRequestDto,
  type ListStatusesRequestData,
} from "../presentation/http/projects/statuses/list-statuses/dtos";
import {
  UpdateStatusRequestDto,
  type UpdateStatusRequestData,
} from "../presentation/http/projects/statuses/update-status/dtos";
import {
  DeleteStatusRequestDto,
  type DeleteStatusRequestData,
} from "../presentation/http/projects/statuses/delete-status/dtos";

// Tasks resource
import { tasksResourceMetadata } from "../presentation/http/projects/tasks/route.metadata";
import { addTaskEndpointMetadata } from "../presentation/http/projects/tasks/add-task/endpoint.metadata";
import { listTasksEndpointMetadata } from "../presentation/http/projects/tasks/list-tasks/endpoint.metadata";
import { getTaskEndpointMetadata } from "../presentation/http/projects/tasks/get-task/endpoint.metadata";
import { updateTaskEndpointMetadata } from "../presentation/http/projects/tasks/update-task/endpoint.metadata";
import { moveTaskEndpointMetadata } from "../presentation/http/projects/tasks/move-task/endpoint.metadata";
import { deleteTaskEndpointMetadata } from "../presentation/http/projects/tasks/delete-task/endpoint.metadata";
import { listTasksByStatusEndpointMetadata } from "../presentation/http/projects/tasks/list-tasks-by-status/endpoint.metadata";
import {
  AddTaskRequestDto,
  type AddTaskRequestData,
} from "../presentation/http/projects/tasks/add-task/dtos";
import {
  ListTasksRequestDto,
  type ListTasksRequestData,
} from "../presentation/http/projects/tasks/list-tasks/dtos";
import {
  GetTaskRequestDto,
  type GetTaskRequestData,
} from "../presentation/http/projects/tasks/get-task/dtos";
import {
  UpdateTaskRequestDto,
  type UpdateTaskRequestData,
} from "../presentation/http/projects/tasks/update-task/dtos";
import {
  MoveTaskRequestDto,
  type MoveTaskRequestData,
} from "../presentation/http/projects/tasks/move-task/dtos";
import {
  DeleteTaskRequestDto,
  type DeleteTaskRequestData,
} from "../presentation/http/projects/tasks/delete-task/dtos";
import {
  ListTasksByStatusRequestDto,
  type ListTasksByStatusRequestData,
} from "../presentation/http/projects/tasks/list-tasks-by-status/dtos";

// Controllers
import type { ProjectManagementControllers } from "./controller.bootstrap";

/**
 * Creates the routes for the project management bounded context.
 *
 * @param controllers - The instantiated controllers from createProjectManagementControllers()
 * @returns Array of RouteInput for registration with a framework adapter
 */
export function createProjectManagementRoutes(
  controllers: ProjectManagementControllers
): RouteInput<HttpRequest>[] {
  const service = projectManagementServiceMetadata;

  // Project routes
  const projectRoutes: RouteInput<HttpRequest>[] = [
    {
      metadata: {
        path: computeRoutePath(
          service,
          projectsResourceMetadata,
          createProjectEndpointMetadata
        ),
        method: createProjectEndpointMetadata.method,
      },
      controller: controllers.createProjectController,
      requestDtoFactory: (req) =>
        new CreateProjectRequestDto(
          req as CreateProjectRequestData,
          createProjectRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          projectsResourceMetadata,
          listProjectsEndpointMetadata
        ),
        method: listProjectsEndpointMetadata.method,
      },
      controller: controllers.listProjectsController,
      requestDtoFactory: (req) =>
        new ListProjectsRequestDto(
          req as ListProjectsRequestData,
          listProjectsRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          projectsResourceMetadata,
          getProjectEndpointMetadata
        ),
        method: getProjectEndpointMetadata.method,
      },
      controller: controllers.getProjectController,
      requestDtoFactory: (req) =>
        new GetProjectRequestDto(
          req as GetProjectRequestData,
          getProjectRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          projectsResourceMetadata,
          updateProjectEndpointMetadata
        ),
        method: updateProjectEndpointMetadata.method,
      },
      controller: controllers.updateProjectController,
      requestDtoFactory: (req) =>
        new UpdateProjectRequestDto(
          req as UpdateProjectRequestData,
          updateProjectRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          projectsResourceMetadata,
          deleteProjectEndpointMetadata
        ),
        method: deleteProjectEndpointMetadata.method,
      },
      controller: controllers.deleteProjectController,
      requestDtoFactory: (req) =>
        new DeleteProjectRequestDto(
          req as DeleteProjectRequestData,
          deleteProjectRequestValidator
        ),
    },
  ];

  // Status routes
  const statusRoutes: RouteInput<HttpRequest>[] = [
    {
      metadata: {
        path: computeRoutePath(
          service,
          statusesResourceMetadata,
          addStatusEndpointMetadata
        ),
        method: addStatusEndpointMetadata.method,
      },
      controller: controllers.addStatusController,
      requestDtoFactory: (req) =>
        new AddStatusRequestDto(
          req as AddStatusRequestData,
          addStatusRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          statusesResourceMetadata,
          listStatusesEndpointMetadata
        ),
        method: listStatusesEndpointMetadata.method,
      },
      controller: controllers.listStatusesController,
      requestDtoFactory: (req) =>
        new ListStatusesRequestDto(
          req as ListStatusesRequestData,
          listStatusesRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          statusesResourceMetadata,
          updateStatusEndpointMetadata
        ),
        method: updateStatusEndpointMetadata.method,
      },
      controller: controllers.updateStatusController,
      requestDtoFactory: (req) =>
        new UpdateStatusRequestDto(
          req as UpdateStatusRequestData,
          updateStatusRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          statusesResourceMetadata,
          deleteStatusEndpointMetadata
        ),
        method: deleteStatusEndpointMetadata.method,
      },
      controller: controllers.deleteStatusController,
      requestDtoFactory: (req) =>
        new DeleteStatusRequestDto(
          req as DeleteStatusRequestData,
          deleteStatusRequestValidator
        ),
    },
  ];

  // Task routes
  const taskRoutes: RouteInput<HttpRequest>[] = [
    {
      metadata: {
        path: computeRoutePath(
          service,
          tasksResourceMetadata,
          addTaskEndpointMetadata
        ),
        method: addTaskEndpointMetadata.method,
      },
      controller: controllers.addTaskController,
      requestDtoFactory: (req) =>
        new AddTaskRequestDto(
          req as AddTaskRequestData,
          addTaskRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          tasksResourceMetadata,
          listTasksEndpointMetadata
        ),
        method: listTasksEndpointMetadata.method,
      },
      controller: controllers.listTasksController,
      requestDtoFactory: (req) =>
        new ListTasksRequestDto(
          req as ListTasksRequestData,
          listTasksRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          tasksResourceMetadata,
          getTaskEndpointMetadata
        ),
        method: getTaskEndpointMetadata.method,
      },
      controller: controllers.getTaskController,
      requestDtoFactory: (req) =>
        new GetTaskRequestDto(
          req as GetTaskRequestData,
          getTaskRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          tasksResourceMetadata,
          updateTaskEndpointMetadata
        ),
        method: updateTaskEndpointMetadata.method,
      },
      controller: controllers.updateTaskController,
      requestDtoFactory: (req) =>
        new UpdateTaskRequestDto(
          req as UpdateTaskRequestData,
          updateTaskRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          tasksResourceMetadata,
          moveTaskEndpointMetadata
        ),
        method: moveTaskEndpointMetadata.method,
      },
      controller: controllers.moveTaskController,
      requestDtoFactory: (req) =>
        new MoveTaskRequestDto(
          req as MoveTaskRequestData,
          moveTaskRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          tasksResourceMetadata,
          deleteTaskEndpointMetadata
        ),
        method: deleteTaskEndpointMetadata.method,
      },
      controller: controllers.deleteTaskController,
      requestDtoFactory: (req) =>
        new DeleteTaskRequestDto(
          req as DeleteTaskRequestData,
          deleteTaskRequestValidator
        ),
    },
    {
      metadata: {
        path: computeRoutePath(
          service,
          tasksResourceMetadata,
          listTasksByStatusEndpointMetadata
        ),
        method: listTasksByStatusEndpointMetadata.method,
      },
      controller: controllers.listTasksByStatusController,
      requestDtoFactory: (req) =>
        new ListTasksByStatusRequestDto(
          req as ListTasksByStatusRequestData,
          listTasksByStatusRequestValidator
        ),
    },
  ];

  return [...projectRoutes, ...statusRoutes, ...taskRoutes];
}
