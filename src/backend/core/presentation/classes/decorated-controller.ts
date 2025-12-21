import type { AccessGuard } from '../interfaces/types/access-guard.type';
import type { AccessGuardResult } from '../interfaces/types/access-guard-result.type';
import type { BaseApiPort } from '../../app/interfaces/ports/base-api.port';
import type { BoundValidator } from '../../global/interfaces/ports/object-validator.port';
import { BaseController } from './base-controller';
import {
  AllowRequest,
  accessGuardFromInstance,
} from '../lib/controller-middlewares/decorators/allow-request.decorator';
import {
  SKIP_REQUEST_VALIDATION,
  ValidateRequest,
  requestValidatorFromInstance,
} from '../lib/controller-middlewares/decorators/validate-request.decorator';
import {
  SKIP_RESPONSE_VALIDATION,
  ValidateResponse,
  responseValidatorFromInstance,
} from '../lib/controller-middlewares/decorators/validate-response.decorator';

export interface DecoratedControllerConfig<TRequest, TResponse, TInput, TOutput> {
  requestMapper: (request: TRequest) => TInput;
  useCase: BaseApiPort<TInput, TOutput>;
  responseMapper: (output: TOutput) => TResponse;
  requestValidator: BoundValidator | typeof SKIP_REQUEST_VALIDATION;
  responseValidator: BoundValidator | typeof SKIP_RESPONSE_VALIDATION;
  accessGuard?: AccessGuard<TRequest>;
}

const allowAllAccessGuard: AccessGuard<unknown> = async (): Promise<AccessGuardResult> => ({
  isAllowed: true,
});

export class DecoratedController<TRequest, TResponse, TInput, TOutput> extends BaseController<
  TRequest,
  TResponse,
  TInput,
  TOutput
> {
  protected readonly requestValidator: BoundValidator | typeof SKIP_REQUEST_VALIDATION;
  protected readonly responseValidator: BoundValidator | typeof SKIP_RESPONSE_VALIDATION;
  protected readonly accessGuard: AccessGuard<TRequest>;

  constructor(
    requestMapper: (request: TRequest) => TInput,
    useCase: BaseApiPort<TInput, TOutput>,
    responseMapper: (output: TOutput) => TResponse,
    requestValidator: BoundValidator | typeof SKIP_REQUEST_VALIDATION,
    responseValidator: BoundValidator | typeof SKIP_RESPONSE_VALIDATION,
    accessGuard?: AccessGuard<TRequest>,
  ) {
    super(requestMapper, useCase, responseMapper);
    this.requestValidator = requestValidator;
    this.responseValidator = responseValidator;
    this.accessGuard = accessGuard ?? (allowAllAccessGuard as AccessGuard<TRequest>);
  }

  static override create<TRequest, TResponse, TInput, TOutput>(
    config: DecoratedControllerConfig<TRequest, TResponse, TInput, TOutput>,
  ): DecoratedController<TRequest, TResponse, TInput, TOutput> {
    return new DecoratedController(
      config.requestMapper,
      config.useCase,
      config.responseMapper,
      config.requestValidator,
      config.responseValidator,
      config.accessGuard,
    );
  }

  @AllowRequest(
    accessGuardFromInstance(
      (instance: unknown) =>
        (instance as DecoratedController<TRequest, TResponse, TInput, TOutput>).accessGuard,
    ),
  )
  @ValidateRequest(
    requestValidatorFromInstance(
      (instance: unknown) =>
        (instance as DecoratedController<TRequest, TResponse, TInput, TOutput>).requestValidator,
    ),
  )
  @ValidateResponse(
    responseValidatorFromInstance(
      (instance: unknown) =>
        (instance as DecoratedController<TRequest, TResponse, TInput, TOutput>).responseValidator,
    ),
  )
  override async execute(input: TRequest): Promise<TResponse> {
    return super.execute(input);
  }
}
