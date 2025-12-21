import { UseCaseError } from './use-case.error';

export class NotFoundError extends UseCaseError {
  constructor({
    message,
    code = 'NOT_FOUND',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
