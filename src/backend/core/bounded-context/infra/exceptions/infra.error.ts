import { CodedError } from '../../../global/exceptions/coded-error.error';

/**
 * SPI errors represent outbound dependency failures (DB, network, external services).
 */
export class InfraError extends CodedError {
  constructor({
    message,
    code = 'INFRA_ERROR',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
