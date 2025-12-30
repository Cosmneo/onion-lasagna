import {
  BaseValueObject,
  InvariantViolationError,
} from '@cosmneo/onion-lasagna/backend/core/onion-layers';

/**
 * Value Object representing a Task's description.
 *
 * Allows empty strings for optional descriptions.
 */
export class TaskDescription extends BaseValueObject<string> {
  static readonly maxLength = 300;

  /**
   * Creates a TaskDescription value object.
   * @param value - The description text (optional, defaults to empty string)
   * @throws {InvariantViolationError} When description exceeds max length
   */
  static create(value?: TaskDescription['value']): TaskDescription {
    const description = value ?? '';

    if (description.length > TaskDescription.maxLength) {
      throw new InvariantViolationError({
        message: `Task description must be at most ${TaskDescription.maxLength} characters`,
        code: 'TASK_DESCRIPTION_TOO_LONG',
      });
    }

    return new TaskDescription(description);
  }
}
