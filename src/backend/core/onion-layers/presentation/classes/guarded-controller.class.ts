import type { AccessGuard } from '../interfaces/types/access-guard.type';
import type { AccessGuardResult } from '../interfaces/types/access-guard-result.type';
import type { BaseInboundPort } from '../../app/interfaces/ports/base-inbound.port';
import type { BaseDto } from '../../../global/classes/base-dto.class';
import { BaseController } from './base-controller.class';
import { AccessDeniedError } from '../exceptions/access-denied.error';

/**
 * Configuration for creating a GuardedController instance.
 *
 * All types must be DTOs (extending BaseDto) to ensure validation at every boundary.
 *
 * @typeParam TRequestDto - Validated request DTO from the framework layer
 * @typeParam TResponseDto - Validated response DTO to return to the framework
 * @typeParam TInDto - Input DTO type for the use case
 * @typeParam TOutDto - Output DTO type from the use case
 */
export interface GuardedControllerConfig<
  TRequestDto extends BaseDto<unknown>,
  TResponseDto extends BaseDto<unknown>,
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> {
  /** Maps the validated request DTO to a use case input DTO. */
  requestMapper: (request: TRequestDto) => TInDto;
  /** The use case to execute. */
  useCase: BaseInboundPort<TInDto, TOutDto>;
  /** Maps the use case output DTO to a validated response DTO. */
  responseMapper: (output: TOutDto) => TResponseDto;
  /** Optional access guard; defaults to allowing all requests. */
  accessGuard?: AccessGuard<TRequestDto>;
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
 * Controller with access control.
 *
 * Extends {@link BaseController} with an access guard that runs before
 * the pipeline. If the guard denies access, an {@link AccessDeniedError}
 * is thrown.
 *
 * All types must be DTOs (extending BaseDto) to ensure validation at every boundary.
 *
 * @typeParam TRequestDto - Validated request DTO from the framework layer
 * @typeParam TResponseDto - Validated response DTO to return to the framework
 * @typeParam TInDto - Input DTO type for the use case
 * @typeParam TOutDto - Output DTO type from the use case
 *
 * @example
 * ```typescript
 * const controller = GuardedController.create({
 *   requestMapper: (req) => UpdateUserInputDto.create(req.data),
 *   useCase: updateUserUseCase,
 *   responseMapper: (output) => UpdateUserResponseDto.create(output.data),
 *   accessGuard: async (req) => ({
 *     isAllowed: req.data.user?.role === 'admin',
 *     reason: 'Admin access required',
 *   }),
 * });
 * ```
 */
export class GuardedController<
  TRequestDto extends BaseDto<unknown>,
  TResponseDto extends BaseDto<unknown>,
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> extends BaseController<TRequestDto, TResponseDto, TInDto, TOutDto> {
  /** The access guard function for this controller. */
  protected readonly accessGuard: AccessGuard<TRequestDto>;

  /**
   * Creates a new GuardedController instance.
   *
   * @param requestMapper - Function to map request DTO to use case input DTO
   * @param useCase - The use case port to execute
   * @param responseMapper - Function to map use case output DTO to response DTO
   * @param accessGuard - Optional access guard; defaults to allowing all
   */
  constructor(
    requestMapper: (request: TRequestDto) => TInDto,
    useCase: BaseInboundPort<TInDto, TOutDto>,
    responseMapper: (output: TOutDto) => TResponseDto,
    accessGuard?: AccessGuard<TRequestDto>,
  ) {
    super(requestMapper, useCase, responseMapper);
    this.accessGuard = accessGuard ?? createAllowAllGuard<TRequestDto>();
  }

  /**
   * Factory method to create a guarded controller from a configuration object.
   *
   * @param config - Controller configuration including optional access guard
   * @returns A new GuardedController instance
   */
  static override create<
    TRequestDto extends BaseDto<unknown>,
    TResponseDto extends BaseDto<unknown>,
    TInDto extends BaseDto<unknown>,
    TOutDto extends BaseDto<unknown>,
  >(
    config: GuardedControllerConfig<TRequestDto, TResponseDto, TInDto, TOutDto>,
  ): GuardedController<TRequestDto, TResponseDto, TInDto, TOutDto> {
    return new GuardedController(
      config.requestMapper,
      config.useCase,
      config.responseMapper,
      config.accessGuard,
    );
  }

  /**
   * Runs the controller pipeline with access control.
   *
   * Checks the access guard before executing the pipeline.
   * If denied, throws {@link AccessDeniedError}.
   *
   * @param input - The validated request DTO
   * @returns Promise resolving to the validated response DTO
   * @throws {AccessDeniedError} When access guard denies the request
   */
  protected override async pipeline(input: TRequestDto): Promise<TResponseDto> {
    await this.checkAccess(input);
    return super.pipeline(input);
  }

  /**
   * Checks access using the configured guard.
   *
   * Override to customize access control logic.
   *
   * @param input - The validated request DTO
   * @throws {AccessDeniedError} When access is denied
   */
  protected async checkAccess(input: TRequestDto): Promise<void> {
    const result = await this.accessGuard(input);
    if (!result.isAllowed) {
      throw new AccessDeniedError({
        message: result.reason ?? 'Access denied',
      });
    }
  }
}
