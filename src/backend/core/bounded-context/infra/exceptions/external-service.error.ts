import { InfraError } from './infra.error';

export class ExternalServiceError extends InfraError {
  constructor({
    message,
    code = 'EXTERNAL_SERVICE_ERROR',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
