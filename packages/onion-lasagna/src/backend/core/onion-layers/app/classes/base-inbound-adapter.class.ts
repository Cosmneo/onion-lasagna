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
 * - Two-phase execution: `authorize()` runs before `handle()`
 * - Typed context passing from authorization to business logic
 * - Automatic error wrapping for unexpected exceptions
 * - Pass-through for known error types (UseCaseError, DomainError, InfraError)
 *
 * Subclasses can override `authorize()` to add authorization checks that run
 * before `handle()`. The authorization phase can return a typed context that
 * is passed to `handle()`, enabling entity caching and avoiding duplicate lookups.
 *
 * @typeParam TInput - Input type (plain object)
 * @typeParam TOutput - Output type (plain object)
 * @typeParam TAuthContext - Authorization context type passed from authorize() to handle() (default: void)
 *
 * @example Basic use case without authorization
 * ```typescript
 * class CreateUserUseCase extends BaseInboundAdapter<CreateUserInput, CreateUserOutput> {
 *   protected async handle(input: CreateUserInput): Promise<CreateUserOutput> {
 *     const user = await this.userRepo.create(input);
 *     return { userId: user.id };
 *   }
 * }
 * ```
 *
 * @example Use case with authorization and context passing
 * ```typescript
 * interface UpdateActivityAuthContext {
 *   activity: Activity;
 *   organization: Organization;
 * }
 *
 * class UpdateActivityUseCase extends BaseInboundAdapter<
 *   UpdateActivityInput,
 *   UpdateActivityOutput,
 *   UpdateActivityAuthContext
 * > {
 *   protected async authorize(input: UpdateActivityInput): Promise<UpdateActivityAuthContext> {
 *     const activity = await this.activityRepo.findById(input.activityId);
 *     if (!activity) {
 *       throw new NotFoundError({ message: 'Activity not found' });
 *     }
 *
 *     const organization = await this.orgRepo.findById(input.organizationId);
 *     if (activity.organizationId !== organization.id) {
 *       throw new ForbiddenError({ message: 'Not authorized to update this activity' });
 *     }
 *
 *     return { activity, organization };
 *   }
 *
 *   protected async handle(
 *     input: UpdateActivityInput,
 *     { activity, organization }: UpdateActivityAuthContext
 *   ): Promise<UpdateActivityOutput> {
 *     // Use pre-loaded entities - no duplicate lookups!
 *     activity.update(input);
 *     await this.activityRepo.save(activity);
 *     return { activityId: activity.id.value };
 *   }
 * }
 * ```
 */
export abstract class BaseInboundAdapter<
  TInput,
  TOutput,
  TAuthContext = void,
> implements BaseInboundPort<TInput, TOutput> {
  /**
   * Authorization check that runs before handle().
   *
   * Override this method to add authorization logic. The returned context
   * is passed to `handle()`, enabling you to cache entities and avoid
   * duplicate database lookups.
   *
   * Default implementation returns `undefined` (no authorization, no context).
   *
   * @param input - Input data
   * @returns Promise resolving to the authorization context (passed to handle)
   * @throws {ForbiddenError} When the user lacks permission for this operation
   * @throws {NotFoundError} When a required resource doesn't exist
   * @throws {UseCaseError} For other authorization failures
   */
  protected async authorize(_input: TInput): Promise<TAuthContext> {
    return undefined as TAuthContext;
  }

  /**
   * Implements the use case logic. Override this method in subclasses.
   *
   * @param input - Input data
   * @param authContext - Authorization context returned from authorize()
   * @returns Promise resolving to the output
   */
  protected abstract handle(input: TInput, authContext: TAuthContext): Promise<TOutput>;

  /**
   * Executes the use case with authorization and error boundary protection.
   *
   * Execution flow:
   * 1. `authorize(input)` - Runs authorization checks, returns context
   * 2. `handle(input, authContext)` - Runs business logic with the context
   *
   * Known error types are re-thrown as-is to preserve error semantics.
   * Unknown errors are wrapped in a UseCaseError to maintain error hierarchy.
   *
   * @param input - Input data
   * @returns Promise resolving to the output
   * @throws {ObjectValidationError} For validation failures (propagated to controller)
   * @throws {UseCaseError} For use case failures or wrapped unknown errors
   * @throws {ForbiddenError} When authorization is denied
   * @throws {NotFoundError} When a required resource is not found
   * @throws {DomainError} For domain invariant violations
   * @throws {InfraError} For infrastructure failures
   */
  public async execute(input: TInput): Promise<TOutput> {
    return wrapErrorUnlessAsync(
      async () => {
        const authContext = await this.authorize(input);
        return this.handle(input, authContext);
      },
      (cause) => new UseCaseError({ message: 'Unexpected use case handler error', cause }),
      [ObjectValidationError, UseCaseError, DomainError, InfraError],
    );
  }
}
