import type { BaseDto } from '../../../../global/classes/base-dto.class';

/**
 * Primary port interface for use case execution (Hexagonal Architecture).
 *
 * Defines the contract for inbound adapters that handle application use cases.
 * Implementations receive a validated input DTO and return an output DTO.
 *
 * @typeParam TInDto - Input DTO type, must extend BaseDto
 * @typeParam TOutDto - Output DTO type, must extend BaseDto
 *
 * @example
 * ```typescript
 * interface CreateUserPort extends BaseInboundPort<CreateUserInputDto, CreateUserOutputDto> {}
 * ```
 */
export interface BaseInboundPort<
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> {
  /**
   * Executes the use case with the provided input.
   *
   * @param input - Validated input DTO
   * @returns Promise resolving to the output DTO
   * @throws {UseCaseError} When use case execution fails
   * @throws {DomainError} When domain invariants are violated
   * @throws {InfraError} When infrastructure operations fail
   */
  execute(input: TInDto): Promise<TOutDto>;
}
