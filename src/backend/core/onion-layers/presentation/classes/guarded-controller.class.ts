import type { AccessGuard } from '../interfaces/types/access-guard.type';
import type { AccessGuardResult } from '../interfaces/types/access-guard-result.type';
import type { BaseInboundPort } from '../../app/interfaces/ports/base-inbound.port';
import type { BaseDto } from '../../../global/classes/base-dto.class';
import { BaseController } from './base-controller.class';
import {
  AllowRequest,
  accessGuardFromInstance,
} from '../lib/controller-middlewares/decorators/allow-request.decorator';

/**
 * Configuration for creating a GuardedController instance.
 *
 * @typeParam TRequest - The raw request type (e.g., HTTP request with auth headers)
 * @typeParam TResponse - The response type to return
 * @typeParam TInDto - Input DTO type for the use case
 * @typeParam TOutDto - Output DTO type from the use case
 */
export interface GuardedControllerConfig<
  TRequest,
  TResponse,
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> {
  /** Maps the raw request to a validated input DTO. */
  requestMapper: (request: TRequest) => TInDto;
  /** The use case to execute. */
  useCase: BaseInboundPort<TInDto, TOutDto>;
  /** Maps the use case output DTO to the response format. */
  responseMapper: (output: TOutDto) => TResponse;
  /** Optional access guard; defaults to allowing all requests. */
  accessGuard?: AccessGuard<TRequest>;
}

/**
 * Creates a type-safe default access guard that allows all requests.
 * @internal
 */
function createAllowAllGuard<T>(): AccessGuard<T> {
  return async (): Promise<AccessGuardResult> => ({
    isAllowed: true,
  });
}

/**
 * Controller with access control via the `@AllowRequest` decorator.
 *
 * Extends {@link BaseController} with an access guard that runs before
 * the use case execution. If the guard denies access, an
 * {@link AccessDeniedError} is thrown.
 *
 * @typeParam TRequest - The raw request type (e.g., HTTP request with auth headers)
 * @typeParam TResponse - The response type to return
 * @typeParam TInDto - Input DTO type for the use case
 * @typeParam TOutDto - Output DTO type from the use case
 *
 * @example
 * ```typescript
 * const controller = GuardedController.create({
 *   requestMapper: (req) => UpdateUserInputDto.create(req.body),
 *   useCase: updateUserUseCase,
 *   responseMapper: (output) => output.value,
 *   accessGuard: async (req) => ({
 *     isAllowed: req.user?.role === 'admin',
 *     reason: 'Admin access required',
 *   }),
 * });
 * ```
 */
export class GuardedController<
  TRequest,
  TResponse,
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> extends BaseController<TRequest, TResponse, TInDto, TOutDto> {
  /** The access guard function for this controller. */
  protected readonly accessGuard: AccessGuard<TRequest>;

  /**
   * Creates a new GuardedController instance.
   *
   * @param requestMapper - Function to map request to input DTO
   * @param useCase - The use case port to execute
   * @param responseMapper - Function to map output DTO to response
   * @param accessGuard - Optional access guard; defaults to allowing all
   */
  constructor(
    requestMapper: (request: TRequest) => TInDto,
    useCase: BaseInboundPort<TInDto, TOutDto>,
    responseMapper: (output: TOutDto) => TResponse,
    accessGuard?: AccessGuard<TRequest>,
  ) {
    super(requestMapper, useCase, responseMapper);
    this.accessGuard = accessGuard ?? createAllowAllGuard<TRequest>();
  }

  /**
   * Factory method to create a guarded controller from a configuration object.
   *
   * @param config - Controller configuration including optional access guard
   * @returns A new GuardedController instance
   */
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

  /**
   * Executes the controller pipeline with access control.
   *
   * The `@AllowRequest` decorator runs the access guard before execution.
   * If denied, throws {@link AccessDeniedError}.
   *
   * @param input - The raw request input
   * @returns Promise resolving to the mapped response
   * @throws {AccessDeniedError} When access guard denies the request
   */
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
