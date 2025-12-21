import { UseCaseError } from './use-case.error';

export class ConflictError extends UseCaseError {
  constructor({
    message,
    code = 'CONFLICT',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
