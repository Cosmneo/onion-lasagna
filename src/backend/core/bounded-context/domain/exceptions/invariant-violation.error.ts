import { DomainError } from './domain-error';

/**
 * Indicates a broken domain invariant (should generally never happen if inputs
 * are validated; can also be used for "assert" style guards).
 */
export class InvariantViolationError extends DomainError {
  constructor({
    message,
    code = 'INVARIANT_VIOLATION',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
