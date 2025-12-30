import { DomainError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

/**
 * Error thrown when attempting to delete a status that is assigned to tasks.
 */
export class StatusInUseError extends DomainError {
  constructor(statusId: string) {
    super({
      message: `Cannot delete status ${statusId} - it is assigned to one or more tasks`,
      code: 'STATUS_IN_USE',
    });
  }
}
