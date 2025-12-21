import { UseCaseError } from './use-case.error';

export class UnprocessableError extends UseCaseError {
  constructor({
    message,
    code = 'UNPROCESSABLE',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
