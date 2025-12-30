import { DomainError } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

/**
 * Error thrown when attempting to delete or modify the only final status.
 */
export class OnlyFinalStatusError extends DomainError {
  constructor() {
    super({
      message: 'Cannot delete or unmark the only final status - project must have at least one',
      code: 'ONLY_FINAL_STATUS',
    });
  }
}
