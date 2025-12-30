import type { BaseInboundPort } from '../../app/interfaces/ports/base-inbound.port';
import type { BaseDto } from '../../../global/classes/base-dto.class';
import { CodedError } from '../../../global/exceptions/coded-error.error';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';
import { wrapErrorUnless, wrapErrorUnlessAsync } from '../../../global/utils/wrap-error.util';
import { ControllerError } from '../exceptions/controller.error';
import { InvalidRequestError } from '../exceptions/invalid-request.error';

/**
 * Configuration for creating a BaseController instance.
 *
 * All types must be DTOs (extending BaseDto) to ensure validation at every boundary:
 * - TRequestDto: Validated HTTP request (body, headers, params, query)
 * - TResponseDto: Validated HTTP response structure
 * - TInDto: Validated use case input (or void for use cases with no input)
 * - TOutDto: Validated use case output (or void for commands with no return value)
 *
 * @typeParam TRequestDto - Validated request DTO from the framework layer
 * @typeParam TResponseDto - Validated response DTO to return to the framework
 * @typeParam TInDto - Input DTO type for the use case (or void)
 * @typeParam TOutDto - Output DTO type from the use case (or void)
 */
export interface BaseControllerConfig<
  TRequestDto extends BaseDto<unknown>,
  TResponseDto extends BaseDto<unknown>,
  TInDto extends BaseDto<unknown> | void,
  TOutDto extends BaseDto<unknown> | void,
> {
  /** Maps the validated request DTO to a use case input DTO. For void use cases, returns undefined. */
  requestMapper: (request: TRequestDto) => TInDto;
  /** The use case to execute. */
  useCase: BaseInboundPort<TInDto, TOutDto>;
  /** Maps the use case output DTO to a validated response DTO. For void use cases, output is undefined. */
  responseMapper: (output: TOutDto) => TResponseDto;
}

/**
 * Base controller implementing the request/response pipeline.
 *
 * Orchestrates the flow: `requestDto → mapRequest → executeUseCase → mapResponse → responseDto`
 *
 * All boundaries are validated DTOs:
 * - Input: TRequestDto (validated by framework layer before controller)
 * - Use case input: TInDto (validated by mapRequest, or void for no-input use cases)
 * - Use case output: TOutDto (validated by use case, or void for commands)
 * - Output: TResponseDto (validated by mapResponse)
 *
 * Features:
 * - Supports both query (with output) and command (void) use cases
 * - Converts {@link ObjectValidationError} to {@link InvalidRequestError}
 * - Passes through known {@link CodedError} types
 * - Wraps unknown errors in {@link ControllerError}
 *
 * Architecture:
 * - {@link execute} - Public entry point with error wrapping (do not override)
 * - {@link pipeline} - Protected pipeline orchestration (override for custom flow)
 * - {@link mapRequest} - Request-to-input transformation
 * - {@link executeUseCase} - Use case execution
 * - {@link mapResponse} - Output-to-response transformation
 *
 * @typeParam TRequestDto - Validated request DTO from the framework layer
 * @typeParam TResponseDto - Validated response DTO to return to the framework
 * @typeParam TInDto - Input DTO type for the use case
 * @typeParam TOutDto - Output DTO type from the use case (or void for commands)
 *
 * @example Basic usage with output
 * ```typescript
 * const controller = BaseController.create({
 *   requestMapper: (req) => CreateUserInputDto.create(req.data),
 *   useCase: createUserUseCase,
 *   responseMapper: (output) => CreateUserResponseDto.create({ id: output.data.id }),
 * });
 *
 * // Framework layer creates the request DTO
 * const requestDto = CreateUserRequestDto.create(httpRequest);
 * const responseDto = await controller.execute(requestDto);
 * ```
 *
 * @example Void use case (command with no return value)
 * ```typescript
 * const controller = BaseController.create({
 *   requestMapper: (req) => DeleteUserInputDto.create(req.data),
 *   useCase: deleteUserUseCase, // Returns void
 *   responseMapper: () => DeleteUserResponseDto.create({ statusCode: 204, body: null }),
 * });
 * ```
 *
 * @example Custom controller overriding pipeline
 * ```typescript
 * class LoggingController extends BaseController<...> {
 *   protected override async pipeline(input: TRequestDto): Promise<TResponseDto> {
 *     console.log('Request received:', input);
 *     const result = await super.pipeline(input);
 *     console.log('Response:', result);
 *     return result;
 *   }
 * }
 * ```
 *
 * @example Custom controller overriding individual methods
 * ```typescript
 * class CachingController extends BaseController<...> {
 *   private cache = new Map();
 *
 *   protected override async executeUseCase(input: TInDto): Promise<TOutDto> {
 *     const key = JSON.stringify(input.data);
 *     if (this.cache.has(key)) return this.cache.get(key);
 *     const result = await super.executeUseCase(input);
 *     this.cache.set(key, result);
 *     return result;
 *   }
 * }
 * ```
 */
export class BaseController<
  TRequestDto extends BaseDto<unknown>,
  TResponseDto extends BaseDto<unknown>,
  TInDto extends BaseDto<unknown> | void,
  TOutDto extends BaseDto<unknown> | void,
> {
  /**
   * Creates a new BaseController instance.
   *
   * @param requestMapper - Function to map request DTO to use case input DTO
   * @param useCase - The use case port to execute
   * @param responseMapper - Function to map use case output DTO to response DTO
   */
  constructor(
    protected readonly requestMapper: (request: TRequestDto) => TInDto,
    protected readonly useCase: BaseInboundPort<TInDto, TOutDto>,
    protected readonly responseMapper: (output: TOutDto) => TResponseDto,
  ) {}

  /**
   * Factory method to create a controller from a configuration object.
   *
   * @param config - Controller configuration
   * @returns A new BaseController instance
   */
  static create<
    TRequestDto extends BaseDto<unknown>,
    TResponseDto extends BaseDto<unknown>,
    TInDto extends BaseDto<unknown> | void,
    TOutDto extends BaseDto<unknown> | void,
  >(
    config: BaseControllerConfig<TRequestDto, TResponseDto, TInDto, TOutDto>,
  ): BaseController<TRequestDto, TResponseDto, TInDto, TOutDto> {
    return new BaseController(config.requestMapper, config.useCase, config.responseMapper);
  }

  /**
   * Executes the controller pipeline with error wrapping.
   *
   * This is the public entry point that ensures consistent error handling.
   * All errors are wrapped in {@link ControllerError} unless they extend {@link CodedError}.
   *
   * **Do not override this method.** Override {@link pipeline} instead for custom pipeline logic.
   *
   * @param input - The validated request DTO
   * @returns Promise resolving to the validated response DTO
   * @throws {InvalidRequestError} When request mapping/validation fails
   * @throws {ControllerError} When an unexpected error occurs
   * @throws {CodedError} When use case throws a known error type
   */
  async execute(input: TRequestDto): Promise<TResponseDto> {
    return wrapErrorUnlessAsync(
      () => this.pipeline(input),
      (cause) =>
        new ControllerError({
          message: cause instanceof Error ? cause.message : 'Controller execution failed',
          cause,
        }),
      [CodedError],
    );
  }

  /**
   * Runs the controller pipeline.
   *
   * Orchestrates: `mapRequest → executeUseCase → mapResponse`
   *
   * Override this method to customize the entire pipeline flow, or override
   * individual protected methods ({@link mapRequest}, {@link executeUseCase},
   * {@link mapResponse}) for more granular control.
   *
   * @param input - The validated request DTO
   * @returns Promise resolving to the validated response DTO
   */
  protected async pipeline(input: TRequestDto): Promise<TResponseDto> {
    const mappedInput = this.mapRequest(input);
    const result = await this.executeUseCase(mappedInput);
    return this.mapResponse(result);
  }

  /**
   * Maps the request DTO to a use case input DTO.
   *
   * Override to add custom pre-processing, logging, or transformation logic.
   * The default implementation uses the configured `requestMapper` and converts
   * {@link ObjectValidationError} to {@link InvalidRequestError}.
   *
   * @param input - The validated request DTO
   * @returns The use case input DTO
   * @throws {InvalidRequestError} When validation fails
   * @throws {ControllerError} When mapping fails unexpectedly
   */
  protected mapRequest(input: TRequestDto): TInDto {
    return wrapErrorUnless(
      () => this.requestMapper(input),
      (cause) => {
        if (cause instanceof ObjectValidationError) {
          return new InvalidRequestError({
            message: cause.message,
            cause,
            validationErrors: cause.validationErrors,
          });
        }
        return new ControllerError({
          message: cause instanceof Error ? cause.message : 'Request mapping failed',
          cause,
        });
      },
      [CodedError],
    );
  }

  /**
   * Executes the use case with the mapped input.
   *
   * Override to add custom logic around use case execution, such as:
   * - Logging/tracing
   * - Caching
   * - Retry logic
   * - Multi-use-case orchestration
   *
   * @param input - The use case input DTO
   * @returns Promise resolving to the use case output DTO
   */
  protected async executeUseCase(input: TInDto): Promise<TOutDto> {
    return this.useCase.execute(input);
  }

  /**
   * Maps the use case output DTO to a response DTO.
   *
   * Override to add custom post-processing, logging, or transformation logic.
   * The default implementation uses the configured `responseMapper`.
   *
   * @param output - The use case output DTO
   * @returns The response DTO
   * @throws {ControllerError} When mapping or validation fails
   */
  protected mapResponse(output: TOutDto): TResponseDto {
    return wrapErrorUnless(
      () => this.responseMapper(output),
      (cause) =>
        new ControllerError({
          message:
            cause instanceof ObjectValidationError
              ? 'Response validation failed'
              : cause instanceof Error
                ? cause.message
                : 'Response mapping failed',
          cause,
        }),
      [CodedError],
    );
  }
}
