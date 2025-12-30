import { DomainError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

/**
 * Error thrown when a status is not found within a project.
 */
export class StatusNotFoundError extends DomainError {
  constructor(statusId: string) {
    super({
      message: `Status ${statusId} not found in project`,
      code: 'STATUS_NOT_FOUND',
    });
  }
}
