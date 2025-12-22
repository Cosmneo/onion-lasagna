import type { BaseInboundPort } from '../../app/interfaces/ports/base-inbound.port';
import type { BaseDto } from '../../../global/classes/base-dto.class';
import { CodedError } from '../../../global/exceptions/coded-error.error';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';
import { ControllerError } from '../exceptions/controller.error';
import { InvalidRequestError } from '../exceptions/invalid-request.error';

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
      const mappedInput = this.mapRequest(input);
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

  private mapRequest(input: TRequest): BaseDto<TInput> {
    try {
      return this.requestMapper(input);
    } catch (error) {
      if (error instanceof ObjectValidationError) {
        throw new InvalidRequestError({
          message: error.message,
          cause: error,
          validationErrors: error.validationErrors,
        });
      }
      throw error;
    }
  }
}
