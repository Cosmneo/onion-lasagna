import type { BaseInboundPort } from '../interfaces/ports/base-inbound.port';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';
import { wrapErrorUnlessAsync } from '../../../global/utils/wrap-error.util';
import { UseCaseError } from '../exceptions/use-case.error';
import { DomainError } from '../../domain/exceptions/domain.error';
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
 * @typeParam TInput - Input type (plain object)
 * @typeParam TOutput - Output type (plain object)
 *
 * @example
 * ```typescript
 * class CreateUserUseCase extends BaseInboundAdapter<CreateUserInput, CreateUserOutput> {
 *   protected async handle(input: CreateUserInput): Promise<CreateUserOutput> {
 *     const user = await this.userRepo.create(input);
 *     return { userId: user.id };
 *   }
 * }
 * ```
 */
export abstract class BaseInboundAdapter<TInput, TOutput> implements BaseInboundPort<
  TInput,
  TOutput
> {
  /**
   * Implements the use case logic. Override this method in subclasses.
   *
   * @param input - Input data
   * @returns Promise resolving to the output
   */
  protected abstract handle(input: TInput): Promise<TOutput>;

  /**
   * Executes the use case with error boundary protection.
   *
   * Known error types are re-thrown as-is to preserve error semantics.
   * Unknown errors are wrapped in a UseCaseError to maintain error hierarchy.
   *
   * @param input - Input data
   * @returns Promise resolving to the output
   * @throws {ObjectValidationError} For validation failures (propagated to controller)
   * @throws {UseCaseError} For use case failures or wrapped unknown errors
   * @throws {DomainError} For domain invariant violations
   * @throws {InfraError} For infrastructure failures
   */
  public async execute(input: TInput): Promise<TOutput> {
    return wrapErrorUnlessAsync(
      () => this.handle(input),
      (cause) => new UseCaseError({ message: 'Unexpected use case handler error', cause }),
      [ObjectValidationError, UseCaseError, DomainError, InfraError],
    );
  }
}
