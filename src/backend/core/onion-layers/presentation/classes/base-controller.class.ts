import type { BaseInboundPort } from '../../app/interfaces/ports/base-inbound.port';
import type { BaseDto } from '../../../global/classes/base-dto.class';
import { CodedError } from '../../../global/exceptions/coded-error.error';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';
import { wrapErrorUnlessAsync } from '../../../global/utils/wrap-error.util';
import { ControllerError } from '../exceptions/controller.error';
import { InvalidRequestError } from '../exceptions/invalid-request.error';
import type { Controller } from '../interfaces/types/controller.type';

/**
 * Configuration for creating a BaseController instance.
 *
 * @typeParam TRequest - The raw request type (e.g., HTTP request body)
 * @typeParam TResponse - The response type to return
 * @typeParam TInDto - Input DTO type for the use case
 * @typeParam TOutDto - Output DTO type from the use case
 */
export interface BaseControllerConfig<
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
}

/**
 * Base controller implementing the request/response pipeline.
 *
 * Orchestrates the flow: `request → requestMapper → useCase → responseMapper → response`
 *
 * Features:
 * - Converts {@link ObjectValidationError} to {@link InvalidRequestError}
 * - Passes through known {@link CodedError} types
 * - Wraps unknown errors in {@link ControllerError}
 *
 * @typeParam TRequest - The raw request type (e.g., HTTP request body)
 * @typeParam TResponse - The response type to return
 * @typeParam TInDto - Input DTO type for the use case
 * @typeParam TOutDto - Output DTO type from the use case
 *
 * @example
 * ```typescript
 * const controller = BaseController.create({
 *   requestMapper: (req) => CreateUserInputDto.create(req.body),
 *   useCase: createUserUseCase,
 *   responseMapper: (output) => ({ id: output.value.id }),
 * });
 *
 * const response = await controller.execute(request);
 * ```
 */
export class BaseController<
  TRequest,
  TResponse,
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> implements Controller<TRequest, TResponse> {
  /**
   * Creates a new BaseController instance.
   *
   * @param requestMapper - Function to map request to input DTO
   * @param useCase - The use case port to execute
   * @param responseMapper - Function to map output DTO to response
   */
  constructor(
    protected readonly requestMapper: (request: TRequest) => TInDto,
    protected readonly useCase: BaseInboundPort<TInDto, TOutDto>,
    protected readonly responseMapper: (output: TOutDto) => TResponse,
  ) {}

  /**
   * Factory method to create a controller from a configuration object.
   *
   * @param config - Controller configuration
   * @returns A new BaseController instance
   */
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

  /**
   * Executes the controller pipeline.
   *
   * @param input - The raw request input
   * @returns Promise resolving to the mapped response
   * @throws {InvalidRequestError} When request validation fails
   * @throws {ControllerError} When an unexpected error occurs
   * @throws {CodedError} When use case throws a known error type
   */
  async execute(input: TRequest): Promise<TResponse> {
    return wrapErrorUnlessAsync(
      async () => {
        const mappedInput = this.mapRequest(input);
        const result = await this.useCase.execute(mappedInput);
        return this.responseMapper(result);
      },
      (cause) =>
        new ControllerError({
          message: cause instanceof Error ? cause.message : 'Controller execution failed',
          cause,
        }),
      [CodedError],
    );
  }

  /**
   * Maps the raw request to an input DTO, converting validation errors.
   * @internal
   */
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
