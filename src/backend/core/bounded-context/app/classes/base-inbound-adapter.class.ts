import type { BaseDto } from '../../../global/classes/base-dto.class';
import type { BaseInboundPort } from '../interfaces/ports/base-inbound.port';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';
import { wrapErrorUnlessAsync } from '../../../global/utils/wrap-error.util';
import { UseCaseError } from '../exceptions/use-case.error';
import { DomainError } from '../../domain/exceptions/domain-error';
import { InfraError } from '../../infra/exceptions/infra.error';

/**
 * Abstract base class for use case handlers (inbound adapters).
 *
 * Implements the {@link BaseInboundPort} interface and provides:
 * - Automatic error wrapping for unexpected exceptions
 * - Pass-through for known error types (UseCaseError, DomainError, InfraError)
 *
 * Subclasses implement the `handle` method with the actual use case logic.
 *
 * @typeParam TInDto - Input DTO type, must extend BaseDto
 * @typeParam TOutDto - Output DTO type, must extend BaseDto
 *
 * @example
 * ```typescript
 * class CreateUserUseCase extends BaseInboundAdapter<CreateUserInputDto, CreateUserOutputDto> {
 *   protected async handle(input: CreateUserInputDto): Promise<CreateUserOutputDto> {
 *     const user = await this.userRepo.create(input.value);
 *     return CreateUserOutputDto.create(user);
 *   }
 * }
 * ```
 */
export abstract class BaseInboundAdapter<
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> implements BaseInboundPort<TInDto, TOutDto> {
  /**
   * Implements the use case logic. Override this method in subclasses.
   *
   * @param input - Validated input DTO
   * @returns Promise resolving to the output DTO
   */
  protected abstract handle(input: TInDto): Promise<TOutDto>;

  /**
   * Executes the use case with error boundary protection.
   *
   * Known error types are re-thrown as-is to preserve error semantics.
   * Unknown errors are wrapped in a UseCaseError to maintain error hierarchy.
   *
   * @param input - Validated input DTO
   * @returns Promise resolving to the output DTO
   * @throws {ObjectValidationError} For validation failures (propagated to controller)
   * @throws {UseCaseError} For use case failures or wrapped unknown errors
   * @throws {DomainError} For domain invariant violations
   * @throws {InfraError} For infrastructure failures
   */
  public async execute(input: TInDto): Promise<TOutDto> {
    return wrapErrorUnlessAsync(
      () => this.handle(input),
      (cause) => new UseCaseError({ message: 'Unexpected use case handler error', cause }),
      [ObjectValidationError, UseCaseError, DomainError, InfraError],
    );
  }
}
