import type { BaseInboundPort } from '../../app/interfaces/ports/base-inbound.port';
import type { BaseDto } from '../../../global/classes/base-dto.class';
import { CodedError } from '../../../global/exceptions/coded-error.error';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';
import { ControllerError } from '../exceptions/controller.error';
import { InvalidRequestError } from '../exceptions/invalid-request.error';

// ============ CONFIG INTERFACES ============

export interface BaseControllerConfig<
  TRequest,
  TResponse,
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> {
  requestMapper: (request: TRequest) => TInDto;
  useCase: BaseInboundPort<TInDto, TOutDto>;
  responseMapper: (output: TOutDto) => TResponse;
}

// ============ BASE CONTROLLER (no validation) ============

export class BaseController<
  TRequest,
  TResponse,
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> {
  constructor(
    protected readonly requestMapper: (request: TRequest) => TInDto,
    protected readonly useCase: BaseInboundPort<TInDto, TOutDto>,
    protected readonly responseMapper: (output: TOutDto) => TResponse,
  ) {}

  static create<
    TRequest,
    TResponse,
    TInDto extends BaseDto<unknown>,
    TOutDto extends BaseDto<unknown>,
  >(
    config: BaseControllerConfig<TRequest, TResponse, TInDto, TOutDto>,
  ): BaseController<TRequest, TResponse, TInDto, TOutDto> {
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

  private mapRequest(input: TRequest): TInDto {
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
