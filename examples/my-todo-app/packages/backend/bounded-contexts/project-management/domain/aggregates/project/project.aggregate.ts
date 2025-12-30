import { BaseAggregateRoot } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import {
  ProjectId,
  ProjectName,
  ProjectDescription,
  StatusId,
  StatusName,
  TaskId,
  TaskTitle,
  TaskDescription,
} from '../../value-objects';
import type { Status, Task } from '../../entities';
import { Status as StatusEntity, Task as TaskEntity } from '../../entities';
import { ProjectCreatedEvent } from '../../events';
import { defaultStatuses } from './policies/value';
import { canDeleteStatus, DeleteStatusDeniedReason } from './policies/business';
import {
  StatusInUseError,
  OnlyFinalStatusError,
  StatusNotFoundError,
  TaskNotFoundError,
  LastStatusError,
} from '../../exceptions';

/**
 * Properties for the Project aggregate.
 */
export interface ProjectProps {
  name: ProjectName;
  description: ProjectDescription;
  statuses: Status[];
  tasks: Task[];
  createdAt: Date;
}

/**
 * Project Aggregate Root.
 *
 * The Project is the aggregate root that owns both Tasks and Statuses.
 * All modifications to tasks and statuses go through the Project to ensure
 * business invariants are maintained.
 *
 * **Invariants:**
 * - Project must have at least one status
 * - Project must have exactly one status with `isFinal: true`
 * - Cannot delete a status that is assigned to any task
 * - Task status must belong to the same project
 *
 * **Policies used:**
 * - Value: `defaultStatuses` - New projects get default statuses
 * - Business: `canDeleteStatus` - Status deletion validation
 *
 * **Events raised:**
 * - `ProjectCreatedEvent` - When project is created
 */
export class Project extends BaseAggregateRoot<ProjectId, ProjectProps> {
  private constructor(id: ProjectId, props: ProjectProps, version?: number) {
    super(id, props, version);
  }

  /**
   * Creates a new Project with default statuses.
   */
  static create(name: ProjectName, description?: ProjectDescription): Project {
    const id = ProjectId.generate();
    const statuses = defaultStatuses();
    const desc = description ?? ProjectDescription.create('');

    const project = new Project(id, {
      name,
      description: desc,
      statuses,
      tasks: [],
      createdAt: new Date(),
    });

    project.addDomainEvent(
      new ProjectCreatedEvent({
        projectId: id.value,
        name: name.value,
        description: desc.value,
        statusCount: statuses.length,
        createdAt: project.createdAt.toISOString(),
      }),
    );

    return project;
  }

  /**
   * Reconstitutes a Project from persistence.
   * Called by repository mappers with already-validated VOs and entities.
   */
  static reconstitute(
    id: ProjectId,
    name: ProjectName,
    description: ProjectDescription,
    statuses: Status[],
    tasks: Task[],
    createdAt: Date,
    version = 0,
  ): Project {
    return new Project(id, { name, description, statuses, tasks, createdAt }, version);
  }

  // --- Getters ---

  get name(): ProjectName {
    return this.props.name;
  }

  get description(): ProjectDescription {
    return this.props.description;
  }

  get statuses(): readonly Status[] {
    return this.props.statuses;
  }

  get tasks(): readonly Task[] {
    return this.props.tasks;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  // --- Project Operations ---

  /**
   * Updates the project name.
   */
  updateName(name: string): void {
    this._props.name = ProjectName.create(name);
  }

  /**
   * Updates the project description.
   */
  updateDescription(description: string): void {
    this._props.description = ProjectDescription.create(description);
  }

  // --- Status Operations ---

  /**
   * Adds a new status to the project.
   */
  addStatus(name: StatusName, isFinal: boolean, order: number): Status {
    const status = StatusEntity.create(name, isFinal, order);
    this._props.statuses.push(status);
    return status;
  }

  /**
   * Updates an existing status.
   */
  updateStatus(
    statusId: StatusId,
    updates: { name?: string; isFinal?: boolean; order?: number },
  ): void {
    const status = this.findStatus(statusId);

    // If unmarking as final, ensure there's at least one other final status
    if (updates.isFinal === false && status.isFinal) {
      const finalStatusCount = this.props.statuses.filter((s) => s.isFinal).length;
      if (finalStatusCount <= 1) {
        throw new OnlyFinalStatusError();
      }
    }

    if (updates.name !== undefined) {
      status.updateName(updates.name);
    }
    if (updates.isFinal !== undefined) {
      status.updateIsFinal(updates.isFinal);
    }
    if (updates.order !== undefined) {
      status.updateOrder(updates.order);
    }
  }

  /**
   * Deletes a status from the project.
   *
   * @throws {StatusNotFoundError} If status doesn't exist
   * @throws {StatusInUseError} If status is assigned to tasks
   * @throws {OnlyFinalStatusError} If it's the only final status
   * @throws {LastStatusError} If it's the last status
   */
  deleteStatus(statusId: StatusId): void {
    const index = this.props.statuses.findIndex((s) => s.id.equals(statusId));
    if (index === -1) {
      throw new StatusNotFoundError(statusId.value);
    }

    const result = canDeleteStatus(this, statusId);
    if (!result.allowed) {
      switch (result.reason) {
        case DeleteStatusDeniedReason.IN_USE:
          throw new StatusInUseError(statusId.value);
        case DeleteStatusDeniedReason.LAST_STATUS:
          throw new LastStatusError();
        case DeleteStatusDeniedReason.ONLY_FINAL_STATUS:
          throw new OnlyFinalStatusError();
      }
    }

    this._props.statuses.splice(index, 1);
  }

  /**
   * Finds a status by ID.
   *
   * @throws {StatusNotFoundError} If status doesn't exist
   */
  findStatus(statusId: StatusId): Status {
    const status = this.props.statuses.find((s) => s.id.equals(statusId));
    if (!status) {
      throw new StatusNotFoundError(statusId.value);
    }
    return status;
  }

  /**
   * Gets the default (first) status for new tasks.
   */
  getDefaultStatus(): Status {
    const sorted = [...this.props.statuses].sort((a, b) => a.order - b.order);
    return sorted[0]!;
  }

  // --- Task Operations ---

  /**
   * Adds a new task to the project.
   *
   * @param title - Task title
   * @param statusId - Status ID (optional, uses default status if not provided)
   * @param description - Task description (optional)
   */
  addTask(title: TaskTitle, statusId?: StatusId, description?: TaskDescription): Task {
    const resolvedStatusId = statusId ?? this.getDefaultStatus().id;

    // Verify status exists in this project
    this.findStatus(resolvedStatusId);

    const task = TaskEntity.create(title, resolvedStatusId, description);

    this._props.tasks.push(task);
    return task;
  }

  /**
   * Updates an existing task.
   */
  updateTask(taskId: TaskId, updates: { title?: string; description?: string }): void {
    const task = this.findTask(taskId);

    if (updates.title !== undefined) {
      task.updateTitle(updates.title);
    }
    if (updates.description !== undefined) {
      task.updateDescription(updates.description);
    }
  }

  /**
   * Moves a task to a different status.
   *
   * Automatically manages `completedAt` based on whether the new status is final.
   */
  moveTask(taskId: TaskId, statusId: StatusId): void {
    const task = this.findTask(taskId);
    const status = this.findStatus(statusId);

    task.moveToStatus(statusId, status.isFinal);
  }

  /**
   * Deletes a task from the project.
   */
  deleteTask(taskId: TaskId): void {
    const index = this.props.tasks.findIndex((t) => t.id.equals(taskId));
    if (index === -1) {
      throw new TaskNotFoundError(taskId.value);
    }

    this._props.tasks.splice(index, 1);
  }

  /**
   * Finds a task by ID.
   *
   * @throws {TaskNotFoundError} If task doesn't exist
   */
  findTask(taskId: TaskId): Task {
    const task = this.props.tasks.find((t) => t.id.equals(taskId));
    if (!task) {
      throw new TaskNotFoundError(taskId.value);
    }
    return task;
  }

  /**
   * Gets all tasks with a specific status.
   */
  getTasksByStatus(statusId: StatusId): readonly Task[] {
    return this.props.tasks.filter((t) => t.statusId.equals(statusId));
  }

  // --- Serialization ---

  /**
   * Converts to a plain object for persistence.
   */
  toPlain(): {
    id: string;
    name: string;
    description: string;
    statuses: Array<{ id: string; name: string; isFinal: boolean; order: number }>;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      statusId: string;
      createdAt: string;
      completedAt: string | null;
    }>;
    createdAt: string;
  } {
    return {
      id: this.id.value,
      name: this.props.name.value,
      description: this.props.description.value,
      statuses: this.props.statuses.map((s) => s.toPlain()),
      tasks: this.props.tasks.map((t) => t.toPlain()),
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}
