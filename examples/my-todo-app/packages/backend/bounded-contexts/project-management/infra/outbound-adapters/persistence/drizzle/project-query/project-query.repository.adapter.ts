import { BaseOutboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import type {
  PaginatedData,
  PaginationInput,
} from '@cosmneo/onion-lasagna/backend/core/global';
import type { ProjectQueryRepositoryPort } from '../../../../../app/ports/outbound/project-query.repository.port';
import type {
  ProjectListItem,
  ProjectDetailView,
  TaskListItem,
  TaskDetailView,
  StatusListItem,
} from '@repo/shared/read-models';
import {
  listProjects as listProjectsMethod,
  getProjectById as getProjectByIdMethod,
  listStatuses as listStatusesMethod,
  listTasks as listTasksMethod,
  listTasksByStatus as listTasksByStatusMethod,
  getTaskById as getTaskByIdMethod,
} from './methods';

export class ProjectQueryRepositoryAdapter
  extends BaseOutboundAdapter
  implements ProjectQueryRepositoryPort
{
  async listProjects(
    pagination: PaginationInput,
  ): Promise<PaginatedData<ProjectListItem>> {
    return listProjectsMethod(pagination);
  }

  async getProjectById(projectId: string): Promise<ProjectDetailView | null> {
    return getProjectByIdMethod(projectId);
  }

  async listStatuses(projectId: string): Promise<StatusListItem[]> {
    return listStatusesMethod(projectId);
  }

  async listTasks(
    projectId: string,
    pagination?: PaginationInput,
  ): Promise<PaginatedData<TaskListItem>> {
    return listTasksMethod(projectId, pagination);
  }

  async listTasksByStatus(
    projectId: string,
    statusId: string,
    pagination?: PaginationInput,
  ): Promise<PaginatedData<TaskListItem>> {
    return listTasksByStatusMethod(projectId, statusId, pagination);
  }

  async getTaskById(
    projectId: string,
    taskId: string,
  ): Promise<TaskDetailView | null> {
    return getTaskByIdMethod(projectId, taskId);
  }
}
