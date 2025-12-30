import { BaseEntity } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { TaskId, TaskTitle, TaskDescription, StatusId } from '../value-objects';

/**
 * Properties for a Task entity.
 */
export interface TaskProps {
  title: TaskTitle;
  description: TaskDescription;
  statusId: StatusId;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Entity representing a task within a Project.
 *
 * Tasks belong to a project and have an assigned status.
 * When moved to a `isFinal` status, `completedAt` is set.
 * When moved away from a `isFinal` status, `completedAt` is cleared.
 */
export class Task extends BaseEntity<TaskId, TaskProps> {
  private constructor(id: TaskId, props: TaskProps, version?: number) {
    super(id, props, version);
  }

  /**
   * Creates a new Task.
   */
  static create(title: TaskTitle, statusId: StatusId, description?: TaskDescription): Task {
    return new Task(TaskId.generate(), {
      title,
      description: description ?? TaskDescription.create(),
      statusId,
      createdAt: new Date(),
      completedAt: null,
    });
  }

  /**
   * Reconstitutes a Task from persistence.
   * Called by repository mappers with already-validated VOs.
   */
  static reconstitute(
    id: TaskId,
    title: TaskTitle,
    description: TaskDescription,
    statusId: StatusId,
    createdAt: Date,
    completedAt: Date | null,
    version = 0,
  ): Task {
    return new Task(id, { title, description, statusId, createdAt, completedAt }, version);
  }

  get title(): TaskTitle {
    return this.props.title;
  }

  get description(): TaskDescription {
    return this.props.description;
  }

  get statusId(): StatusId {
    return this.props.statusId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
  }

  get isCompleted(): boolean {
    return this.props.completedAt !== null;
  }

  /**
   * Updates the task title.
   */
  updateTitle(title: string): void {
    this._props.title = TaskTitle.create(title);
  }

  /**
   * Updates the task description.
   */
  updateDescription(description: string): void {
    this._props.description = TaskDescription.create(description);
  }

  /**
   * Moves the task to a new status.
   *
   * @param statusId - The new status ID
   * @param isFinal - Whether the new status is a final/completion status
   */
  moveToStatus(statusId: StatusId, isFinal: boolean): void {
    this._props.statusId = statusId;

    if (isFinal && !this.props.completedAt) {
      this._props.completedAt = new Date();
    } else if (!isFinal && this.props.completedAt) {
      this._props.completedAt = null;
    }
  }

  /**
   * Converts to a plain object for events or persistence.
   */
  toPlain(): {
    id: string;
    title: string;
    description: string;
    statusId: string;
    createdAt: string;
    completedAt: string | null;
  } {
    return {
      id: this.id.value,
      title: this.props.title.value,
      description: this.props.description.value,
      statusId: this.props.statusId.value,
      createdAt: this.props.createdAt.toISOString(),
      completedAt: this.props.completedAt?.toISOString() ?? null,
    };
  }
}
