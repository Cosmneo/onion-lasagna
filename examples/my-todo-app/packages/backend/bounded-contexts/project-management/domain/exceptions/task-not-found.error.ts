import { DomainError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

/**
 * Error thrown when a task is not found within a project.
 */
export class TaskNotFoundError extends DomainError {
  constructor(taskId: string) {
    super({
      message: `Task ${taskId} not found in project`,
      code: 'TASK_NOT_FOUND',
    });
  }
}
