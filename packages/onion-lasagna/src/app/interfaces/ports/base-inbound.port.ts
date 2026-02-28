/**
 * Primary port interface for use case execution (Hexagonal Architecture).
 *
 * Defines the contract for inbound adapters that handle application use cases.
 * Implementations receive an optional input and return an optional output.
 *
 * @typeParam TInput - Input type (plain object or void for no input)
 * @typeParam TOutput - Output type (plain object or void for no output)
 *
 * @example
 * ```typescript
 * // With input and output
 * interface CreateUserPort extends BaseInboundPort<CreateUserInput, CreateUserOutput> {}
 *
 * // With input, no output
 * interface DeleteUserPort extends BaseInboundPort<DeleteUserInput, void> {}
 *
 * // No input, with output
 * interface GetAllUsersPort extends BaseInboundPort<void, GetAllUsersOutput> {}
 *
 * // No input, no output
 * interface SeedDatabasePort extends BaseInboundPort<void, void> {}
 * ```
 */

export interface BaseInboundPort<TInput = void, TOutput = void> {
  /**
   * Executes the use case with the provided input.
   *
   * @param args - Input data (required when TInput is not void)
   * @returns Promise resolving to the output (or void)
   * @throws {UseCaseError} When use case execution fails
   * @throws {DomainError} When domain invariants are violated
   * @throws {InfraError} When infrastructure operations fail
   */
  execute(...args: TInput extends void ? [] : [input: TInput]): Promise<TOutput>;
}
