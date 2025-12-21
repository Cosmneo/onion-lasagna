import { DomainError } from './domain-error';

/**
 * Used when the domain layer detects a partial/incomplete load of state.
 * Arguably should never escape an application boundary; typically maps to 500.
 */
export class PartialLoadError extends DomainError {
  constructor({
    message,
    code = 'PARTIAL_LOAD',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
