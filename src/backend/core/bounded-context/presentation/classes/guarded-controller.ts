import type { AccessGuard } from '../interfaces/types/access-guard.type';
import type { AccessGuardResult } from '../interfaces/types/access-guard-result.type';
import type { BaseInboundPort } from '../../app/interfaces/ports/base-inbound.port';
import type { BaseDto } from '../../../global/classes/base-dto.class';
import { BaseController } from './base-controller';
import {
  AllowRequest,
  accessGuardFromInstance,
} from '../lib/controller-middlewares/decorators/allow-request.decorator';

export interface GuardedControllerConfig<TRequest, TResponse, TInput, TOutput> {
  requestMapper: (request: TRequest) => BaseDto<TInput>;
  useCase: BaseInboundPort<TInput, TOutput>;
  responseMapper: (output: BaseDto<TOutput>) => TResponse;
  accessGuard?: AccessGuard<TRequest>;
}

const allowAllAccessGuard: AccessGuard<unknown> = async (): Promise<AccessGuardResult> => ({
  isAllowed: true,
});

export class GuardedController<TRequest, TResponse, TInput, TOutput> extends BaseController<
  TRequest,
  TResponse,
  TInput,
  TOutput
> {
  protected readonly accessGuard: AccessGuard<TRequest>;

  constructor(
    requestMapper: (request: TRequest) => BaseDto<TInput>,
    useCase: BaseInboundPort<TInput, TOutput>,
    responseMapper: (output: BaseDto<TOutput>) => TResponse,
    accessGuard?: AccessGuard<TRequest>,
  ) {
    super(requestMapper, useCase, responseMapper);
    this.accessGuard = accessGuard ?? (allowAllAccessGuard as AccessGuard<TRequest>);
  }

  static override create<TRequest, TResponse, TInput, TOutput>(
    config: GuardedControllerConfig<TRequest, TResponse, TInput, TOutput>,
  ): GuardedController<TRequest, TResponse, TInput, TOutput> {
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
        (instance as GuardedController<TRequest, TResponse, TInput, TOutput>).accessGuard,
    ),
  )
  override async execute(input: TRequest): Promise<TResponse> {
    return super.execute(input);
  }
}
