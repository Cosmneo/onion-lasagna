import type { AccessGuard } from '../interfaces/types/access-guard.type';
import type { AccessGuardResult } from '../interfaces/types/access-guard-result.type';
import type { BaseInboundPort } from '../../app/interfaces/ports/base-inbound.port';
import type { BaseDto } from '../../../global/classes/base-dto.class';
import { BaseController } from './base-controller';
import {
  AllowRequest,
  accessGuardFromInstance,
} from '../lib/controller-middlewares/decorators/allow-request.decorator';

export interface GuardedControllerConfig<
  TRequest,
  TResponse,
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> {
  requestMapper: (request: TRequest) => TInDto;
  useCase: BaseInboundPort<TInDto, TOutDto>;
  responseMapper: (output: TOutDto) => TResponse;
  accessGuard?: AccessGuard<TRequest>;
}

const allowAllAccessGuard: AccessGuard<unknown> = async (): Promise<AccessGuardResult> => ({
  isAllowed: true,
});

export class GuardedController<
  TRequest,
  TResponse,
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> extends BaseController<TRequest, TResponse, TInDto, TOutDto> {
  protected readonly accessGuard: AccessGuard<TRequest>;

  constructor(
    requestMapper: (request: TRequest) => TInDto,
    useCase: BaseInboundPort<TInDto, TOutDto>,
    responseMapper: (output: TOutDto) => TResponse,
    accessGuard?: AccessGuard<TRequest>,
  ) {
    super(requestMapper, useCase, responseMapper);
    this.accessGuard = accessGuard ?? (allowAllAccessGuard as AccessGuard<TRequest>);
  }

  static override create<
    TRequest,
    TResponse,
    TInDto extends BaseDto<unknown>,
    TOutDto extends BaseDto<unknown>,
  >(
    config: GuardedControllerConfig<TRequest, TResponse, TInDto, TOutDto>,
  ): GuardedController<TRequest, TResponse, TInDto, TOutDto> {
    return new GuardedController(
      config.requestMapper,
      config.useCase,
      config.responseMapper,
      config.accessGuard,
    );
  }

  @AllowRequest(
    accessGuardFromInstance(
      (instance: unknown) =>
        (instance as GuardedController<TRequest, TResponse, TInDto, TOutDto>).accessGuard,
    ),
  )
  override async execute(input: TRequest): Promise<TResponse> {
    return super.execute(input);
  }
}
