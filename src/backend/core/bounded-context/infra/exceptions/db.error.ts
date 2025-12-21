import { InfraError } from './infra.error';

export class DbError extends InfraError {
  constructor({
    message,
    code = 'DB_ERROR',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
