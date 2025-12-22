import { CodedError } from '../../../global/exceptions/coded-error.error';

export class ControllerError extends CodedError {
  constructor({
    message,
    code = 'CONTROLLER_ERROR',
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    super({ message, code, cause });
  }
}
