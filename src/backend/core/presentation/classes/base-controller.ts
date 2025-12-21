import type { BaseApiPort } from '../../app/interfaces/ports/base-api.port';
import { CodedError } from '../../global/exceptions/coded-error.error';
import { ControllerError } from '../exceptions/controller.error';

// ============ CONFIG INTERFACES ============

export interface BaseControllerConfig<TRequest, TResponse, TInput, TOutput> {
  requestMapper: (request: TRequest) => TInput;
  useCase: BaseApiPort<TInput, TOutput>;
  responseMapper: (output: TOutput) => TResponse;
}

// ============ BASE CONTROLLER (no validation) ============

export class BaseController<TRequest, TResponse, TInput, TOutput> {
  constructor(
    protected readonly requestMapper: (request: TRequest) => TInput,
    protected readonly useCase: BaseApiPort<TInput, TOutput>,
    protected readonly responseMapper: (output: TOutput) => TResponse,
  ) {}

  static create<TRequest, TResponse, TInput, TOutput>(
    config: BaseControllerConfig<TRequest, TResponse, TInput, TOutput>,
  ): BaseController<TRequest, TResponse, TInput, TOutput> {
    return new BaseController(config.requestMapper, config.useCase, config.responseMapper);
  }

  async execute(input: TRequest): Promise<TResponse> {
    try {
      const mappedInput = this.requestMapper(input);
      const result = await this.useCase.execute(mappedInput);
      return this.responseMapper(result);
    } catch (error) {
      if (error instanceof CodedError) {
        throw error;
      }

      throw new ControllerError({
        message: error instanceof Error ? error.message : 'Controller execution failed',
        cause: error,
      });
    }
  }
}
