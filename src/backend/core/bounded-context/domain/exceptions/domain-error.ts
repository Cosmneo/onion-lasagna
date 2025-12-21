import { CodedError } from '../../../global/exceptions/coded-error.error';

/**
 * Domain errors represent failures inside the domain layer
 * (business rules, invariants, aggregates, etc).
 */
export class DomainError extends CodedError {
  constructor({
    message,
    code = 'DOMAIN_ERROR',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
