import { InfraError } from './infra.error';

export class NetworkError extends InfraError {
  constructor({
    message,
    code = 'NETWORK_ERROR',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
