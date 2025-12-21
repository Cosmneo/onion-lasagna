import { InfraError } from './infra.error';

export class TimeoutError extends InfraError {
  constructor({
    message,
    code = 'TIMEOUT_ERROR',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
