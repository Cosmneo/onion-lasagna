import type { BaseDto } from '../../../../global/classes/base-dto.class';

/**
 * Primary port interface for use case execution (Hexagonal Architecture).
 *
 * Defines the contract for inbound adapters that handle application use cases.
 * Implementations receive an optional validated input DTO and return an optional output DTO.
 *
 * @typeParam TInDto - Input DTO type (BaseDto or void for no input)
 * @typeParam TOutDto - Output DTO type (BaseDto or void for no output)
 *
 * @example
 * ```typescript
 * // With input and output
 * interface CreateUserPort extends BaseInboundPort<CreateUserInputDto, CreateUserOutputDto> {}
 *
 * // With input, no output
 * interface DeleteUserPort extends BaseInboundPort<DeleteUserInputDto, void> {}
 *
 * // No input, with output
 * interface GetAllUsersPort extends BaseInboundPort<void, GetAllUsersOutputDto> {}
 *
 * // No input, no output
 * interface SeedDatabasePort extends BaseInboundPort<void, void> {}
 * ```
 */
/* eslint-disable @typescript-eslint/no-invalid-void-type */
export interface BaseInboundPort<
  TInDto extends BaseDto<unknown> | void = void,
  TOutDto extends BaseDto<unknown> | void = void,
> {
  /* eslint-enable @typescript-eslint/no-invalid-void-type */
  /**
   * Executes the use case with the provided input.
   *
   * @param input - Validated input DTO (optional if TInDto is void)
   * @returns Promise resolving to the output DTO (or void)
   * @throws {UseCaseError} When use case execution fails
   * @throws {DomainError} When domain invariants are violated
   * @throws {InfraError} When infrastructure operations fail
   */
  execute(input?: TInDto): Promise<TOutDto>;
}
