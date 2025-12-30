import { BaseController } from '@cosmneo/onion-lasagna/backend/core/presentation';
import { SKIP_DTO_VALIDATION } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  createProjectResponseValidator,
  listProjectsResponseValidator,
  getProjectResponseValidator,
  addStatusResponseValidator,
  listStatusesResponseValidator,
  addTaskResponseValidator,
  listTasksResponseValidator,
  getTaskResponseValidator,
  listTasksByStatusResponseValidator,
} from './validators.bootstrap';

// Project use cases and ports
import type { CreateProjectPort } from '../app/ports/inbound/projects/create-project.command.port';
import type { ListProjectsPort } from '../app/ports/inbound/projects/list-projects.query.port';
import type { GetProjectPort } from '../app/ports/inbound/projects/get-project.query.port';
import type { UpdateProjectPort, UpdateProjectInputDto } from '../app/ports/inbound/projects/update-project.command.port';
import type { DeleteProjectPort, DeleteProjectInputDto } from '../app/ports/inbound/projects/delete-project.command.port';

// Status use cases and ports
import type { AddStatusPort } from '../app/ports/inbound/statuses/add-status.command.port';
import type { ListStatusesPort } from '../app/ports/inbound/statuses/list-statuses.query.port';
import type { UpdateStatusPort, UpdateStatusInputDto } from '../app/ports/inbound/statuses/update-status.command.port';
import type { DeleteStatusPort, DeleteStatusInputDto } from '../app/ports/inbound/statuses/delete-status.command.port';

// Task use cases and ports
import type { AddTaskPort } from '../app/ports/inbound/tasks/add-task.command.port';
import type { ListTasksPort } from '../app/ports/inbound/tasks/list-tasks.query.port';
import type { GetTaskPort } from '../app/ports/inbound/tasks/get-task.query.port';
import type { UpdateTaskPort, UpdateTaskInputDto } from '../app/ports/inbound/tasks/update-task.command.port';
import type { MoveTaskPort, MoveTaskInputDto } from '../app/ports/inbound/tasks/move-task.command.port';
import type { DeleteTaskPort, DeleteTaskInputDto } from '../app/ports/inbound/tasks/delete-task.command.port';
import type { ListTasksByStatusPort } from '../app/ports/inbound/tasks/list-tasks-by-status.query.port';

// Project mappers and types
import {
  createProjectToUseCaseMapper,
  createProjectToResponseMapper,
} from '../presentation/http/projects/create-project/mappers';
import type { CreateProjectRequestDto } from '../presentation/http/projects/create-project/dtos';
import type { CreateProjectOutputDto } from '../app/ports/inbound/projects/create-project.command.port';
import {
  listProjectsToUseCaseMapper,
  listProjectsToResponseMapper,
} from '../presentation/http/projects/list-projects/mappers';
import type { ListProjectsRequestDto } from '../presentation/http/projects/list-projects/dtos';
import type { ListProjectsOutputDto } from '../app/ports/inbound/projects/list-projects.query.port';
import {
  getProjectToUseCaseMapper,
  getProjectToResponseMapper,
} from '../presentation/http/projects/get-project/mappers';
import type { GetProjectRequestDto } from '../presentation/http/projects/get-project/dtos';
import type { GetProjectOutputDto } from '../app/ports/inbound/projects/get-project.query.port';
import {
  updateProjectToUseCaseMapper,
  updateProjectToResponseMapper,
} from '../presentation/http/projects/update-project/mappers';
import type { UpdateProjectRequestDto, UpdateProjectResponseDto } from '../presentation/http/projects/update-project/dtos';
import {
  deleteProjectToUseCaseMapper,
  deleteProjectToResponseMapper,
} from '../presentation/http/projects/delete-project/mappers';
import type { DeleteProjectRequestDto, DeleteProjectResponseDto } from '../presentation/http/projects/delete-project/dtos';

// Status mappers and types
import {
  addStatusToUseCaseMapper,
  addStatusToResponseMapper,
} from '../presentation/http/projects/statuses/add-status/mappers';
import type { AddStatusRequestDto } from '../presentation/http/projects/statuses/add-status/dtos';
import type { AddStatusOutputDto } from '../app/ports/inbound/statuses/add-status.command.port';
import {
  listStatusesToUseCaseMapper,
  listStatusesToResponseMapper,
} from '../presentation/http/projects/statuses/list-statuses/mappers';
import type { ListStatusesRequestDto } from '../presentation/http/projects/statuses/list-statuses/dtos';
import type { ListStatusesOutputDto } from '../app/ports/inbound/statuses/list-statuses.query.port';
import {
  updateStatusToUseCaseMapper,
  updateStatusToResponseMapper,
} from '../presentation/http/projects/statuses/update-status/mappers';
import type { UpdateStatusRequestDto, UpdateStatusResponseDto } from '../presentation/http/projects/statuses/update-status/dtos';
import {
  deleteStatusToUseCaseMapper,
  deleteStatusToResponseMapper,
} from '../presentation/http/projects/statuses/delete-status/mappers';
import type { DeleteStatusRequestDto, DeleteStatusResponseDto } from '../presentation/http/projects/statuses/delete-status/dtos';

// Task mappers and types
import {
  addTaskToUseCaseMapper,
  addTaskToResponseMapper,
} from '../presentation/http/projects/tasks/add-task/mappers';
import type { AddTaskRequestDto } from '../presentation/http/projects/tasks/add-task/dtos';
import type { AddTaskOutputDto } from '../app/ports/inbound/tasks/add-task.command.port';
import {
  listTasksToUseCaseMapper,
  listTasksToResponseMapper,
} from '../presentation/http/projects/tasks/list-tasks/mappers';
import type { ListTasksRequestDto } from '../presentation/http/projects/tasks/list-tasks/dtos';
import type { ListTasksOutputDto } from '../app/ports/inbound/tasks/list-tasks.query.port';
import {
  getTaskToUseCaseMapper,
  getTaskToResponseMapper,
} from '../presentation/http/projects/tasks/get-task/mappers';
import type { GetTaskRequestDto } from '../presentation/http/projects/tasks/get-task/dtos';
import type { GetTaskOutputDto } from '../app/ports/inbound/tasks/get-task.query.port';
import {
  updateTaskToUseCaseMapper,
  updateTaskToResponseMapper,
} from '../presentation/http/projects/tasks/update-task/mappers';
import type { UpdateTaskRequestDto, UpdateTaskResponseDto } from '../presentation/http/projects/tasks/update-task/dtos';
import {
  moveTaskToUseCaseMapper,
  moveTaskToResponseMapper,
} from '../presentation/http/projects/tasks/move-task/mappers';
import type { MoveTaskRequestDto, MoveTaskResponseDto } from '../presentation/http/projects/tasks/move-task/dtos';
import {
  deleteTaskToUseCaseMapper,
  deleteTaskToResponseMapper,
} from '../presentation/http/projects/tasks/delete-task/mappers';
import type { DeleteTaskRequestDto, DeleteTaskResponseDto } from '../presentation/http/projects/tasks/delete-task/dtos';
import {
  listTasksByStatusToUseCaseMapper,
  listTasksByStatusToResponseMapper,
} from '../presentation/http/projects/tasks/list-tasks-by-status/mappers';
import type { ListTasksByStatusRequestDto } from '../presentation/http/projects/tasks/list-tasks-by-status/dtos';
import type { ListTasksByStatusOutputDto } from '../app/ports/inbound/tasks/list-tasks-by-status.query.port';

export interface ProjectManagementControllerDeps {
  // Project use cases
  createProjectUseCase: CreateProjectPort;
  listProjectsUseCase: ListProjectsPort;
  getProjectUseCase: GetProjectPort;
  updateProjectUseCase: UpdateProjectPort;
  deleteProjectUseCase: DeleteProjectPort;
  // Status use cases
  addStatusUseCase: AddStatusPort;
  listStatusesUseCase: ListStatusesPort;
  updateStatusUseCase: UpdateStatusPort;
  deleteStatusUseCase: DeleteStatusPort;
  // Task use cases
  addTaskUseCase: AddTaskPort;
  listTasksUseCase: ListTasksPort;
  getTaskUseCase: GetTaskPort;
  updateTaskUseCase: UpdateTaskPort;
  moveTaskUseCase: MoveTaskPort;
  deleteTaskUseCase: DeleteTaskPort;
  listTasksByStatusUseCase: ListTasksByStatusPort;
}

export function createProjectManagementControllers(deps: ProjectManagementControllerDeps) {
  return {
    // Project controllers
    createProjectController: BaseController.create({
      requestMapper: (req: CreateProjectRequestDto) =>
        createProjectToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.createProjectUseCase,
      responseMapper: (out: CreateProjectOutputDto) =>
        createProjectToResponseMapper(out, createProjectResponseValidator),
    }),
    listProjectsController: BaseController.create({
      requestMapper: (req: ListProjectsRequestDto) =>
        listProjectsToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.listProjectsUseCase,
      responseMapper: (out: ListProjectsOutputDto) =>
        listProjectsToResponseMapper(out, listProjectsResponseValidator),
    }),
    getProjectController: BaseController.create({
      requestMapper: (req: GetProjectRequestDto) =>
        getProjectToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.getProjectUseCase,
      responseMapper: (out: GetProjectOutputDto) =>
        getProjectToResponseMapper(out, getProjectResponseValidator),
    }),
    updateProjectController: BaseController.create<
      UpdateProjectRequestDto,
      UpdateProjectResponseDto,
      UpdateProjectInputDto,
      void
    >({
      requestMapper: (req) => updateProjectToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.updateProjectUseCase,
      responseMapper: () => updateProjectToResponseMapper(SKIP_DTO_VALIDATION),
    }),
    deleteProjectController: BaseController.create<
      DeleteProjectRequestDto,
      DeleteProjectResponseDto,
      DeleteProjectInputDto,
      void
    >({
      requestMapper: (req) => deleteProjectToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.deleteProjectUseCase,
      responseMapper: () => deleteProjectToResponseMapper(SKIP_DTO_VALIDATION),
    }),

    // Status controllers
    addStatusController: BaseController.create({
      requestMapper: (req: AddStatusRequestDto) =>
        addStatusToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.addStatusUseCase,
      responseMapper: (out: AddStatusOutputDto) =>
        addStatusToResponseMapper(out, addStatusResponseValidator),
    }),
    listStatusesController: BaseController.create({
      requestMapper: (req: ListStatusesRequestDto) =>
        listStatusesToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.listStatusesUseCase,
      responseMapper: (out: ListStatusesOutputDto) =>
        listStatusesToResponseMapper(out, listStatusesResponseValidator),
    }),
    updateStatusController: BaseController.create<
      UpdateStatusRequestDto,
      UpdateStatusResponseDto,
      UpdateStatusInputDto,
      void
    >({
      requestMapper: (req) => updateStatusToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.updateStatusUseCase,
      responseMapper: () => updateStatusToResponseMapper(SKIP_DTO_VALIDATION),
    }),
    deleteStatusController: BaseController.create<
      DeleteStatusRequestDto,
      DeleteStatusResponseDto,
      DeleteStatusInputDto,
      void
    >({
      requestMapper: (req) => deleteStatusToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.deleteStatusUseCase,
      responseMapper: () => deleteStatusToResponseMapper(SKIP_DTO_VALIDATION),
    }),

    // Task controllers
    addTaskController: BaseController.create({
      requestMapper: (req: AddTaskRequestDto) =>
        addTaskToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.addTaskUseCase,
      responseMapper: (out: AddTaskOutputDto) =>
        addTaskToResponseMapper(out, addTaskResponseValidator),
    }),
    listTasksController: BaseController.create({
      requestMapper: (req: ListTasksRequestDto) =>
        listTasksToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.listTasksUseCase,
      responseMapper: (out: ListTasksOutputDto) =>
        listTasksToResponseMapper(out, listTasksResponseValidator),
    }),
    getTaskController: BaseController.create({
      requestMapper: (req: GetTaskRequestDto) =>
        getTaskToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.getTaskUseCase,
      responseMapper: (out: GetTaskOutputDto) =>
        getTaskToResponseMapper(out, getTaskResponseValidator),
    }),
    updateTaskController: BaseController.create<
      UpdateTaskRequestDto,
      UpdateTaskResponseDto,
      UpdateTaskInputDto,
      void
    >({
      requestMapper: (req) => updateTaskToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.updateTaskUseCase,
      responseMapper: () => updateTaskToResponseMapper(SKIP_DTO_VALIDATION),
    }),
    moveTaskController: BaseController.create<
      MoveTaskRequestDto,
      MoveTaskResponseDto,
      MoveTaskInputDto,
      void
    >({
      requestMapper: (req) => moveTaskToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.moveTaskUseCase,
      responseMapper: () => moveTaskToResponseMapper(SKIP_DTO_VALIDATION),
    }),
    deleteTaskController: BaseController.create<
      DeleteTaskRequestDto,
      DeleteTaskResponseDto,
      DeleteTaskInputDto,
      void
    >({
      requestMapper: (req) => deleteTaskToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.deleteTaskUseCase,
      responseMapper: () => deleteTaskToResponseMapper(SKIP_DTO_VALIDATION),
    }),
    listTasksByStatusController: BaseController.create({
      requestMapper: (req: ListTasksByStatusRequestDto) =>
        listTasksByStatusToUseCaseMapper(req, SKIP_DTO_VALIDATION),
      useCase: deps.listTasksByStatusUseCase,
      responseMapper: (out: ListTasksByStatusOutputDto) =>
        listTasksByStatusToResponseMapper(out, listTasksByStatusResponseValidator),
    }),
  };
}

export type ProjectManagementControllers = ReturnType<typeof createProjectManagementControllers>;
