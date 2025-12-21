import type { BaseInboundPort } from '../../bounded-context/app/interfaces/ports/base-inbound.port';
import type { BaseDto } from '../../global/classes/based-dto.class';
import { CodedError } from '../../global/exceptions/coded-error.error';
import { ControllerError } from '../exceptions/controller.error';

// ============ CONFIG INTERFACES ============

export interface BaseControllerConfig<TRequest, TResponse, TInput, TOutput> {
  requestMapper: (request: TRequest) => BaseDto<TInput>;
  useCase: BaseInboundPort<TInput, TOutput>;
  responseMapper: (output: BaseDto<TOutput>) => TResponse;
}

// ============ BASE CONTROLLER (no validation) ============

export class BaseController<TRequest, TResponse, TInput, TOutput> {
  constructor(
    protected readonly requestMapper: (request: TRequest) => BaseDto<TInput>,
    protected readonly useCase: BaseInboundPort<TInput, TOutput>,
    protected readonly responseMapper: (output: BaseDto<TOutput>) => TResponse,
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
