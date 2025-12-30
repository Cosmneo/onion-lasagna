import type {
  PaginatedData,
  PaginationInput,
} from '@cosmneo/onion-lasagna/backend/core/global';
import type {
  ProjectListItem,
  ProjectDetailView,
  TaskListItem,
  TaskDetailView,
  StatusListItem,
} from '@repo/shared/read-models';

/**
 * Outbound port for Project read model queries.
 *
 * Used by query use cases to fetch data for presentation.
 * Implementations may use optimized read models or direct DB queries.
 */
export interface ProjectQueryRepositoryPort {
  /**
   * Lists all projects with pagination.
   */
  listProjects(pagination: PaginationInput): Promise<PaginatedData<ProjectListItem>>;

  /**
   * Gets a project detail view by ID.
   * Returns null if not found.
   */
  getProjectById(projectId: string): Promise<ProjectDetailView | null>;

  /**
   * Lists all statuses for a project.
   */
  listStatuses(projectId: string): Promise<StatusListItem[]>;

  /**
   * Lists all tasks in a project with pagination.
   */
  listTasks(
    projectId: string,
    pagination?: PaginationInput,
  ): Promise<PaginatedData<TaskListItem>>;

  /**
   * Lists tasks filtered by status with pagination.
   */
  listTasksByStatus(
    projectId: string,
    statusId: string,
    pagination?: PaginationInput,
  ): Promise<PaginatedData<TaskListItem>>;

  /**
   * Gets a task detail view by ID.
   * Returns null if not found.
   */
  getTaskById(projectId: string, taskId: string): Promise<TaskDetailView | null>;
}
