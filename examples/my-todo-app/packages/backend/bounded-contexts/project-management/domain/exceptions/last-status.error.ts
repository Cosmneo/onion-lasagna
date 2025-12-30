import { DomainError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

/**
 * Error thrown when attempting to delete the last status of a project.
 */
export class LastStatusError extends DomainError {
  constructor() {
    super({
      message: 'Cannot delete the last status - project must have at least one status',
      code: 'LAST_STATUS',
    });
  }
}
