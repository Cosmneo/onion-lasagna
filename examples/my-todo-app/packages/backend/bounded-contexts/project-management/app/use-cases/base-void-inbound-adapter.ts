import type { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import {
  ObjectValidationError,
  wrapErrorUnlessAsync,
} from '@cosmneo/onion-lasagna/backend/core/global';
import {
  UseCaseError,
  DomainError,
  InfraError,
} from '@cosmneo/onion-lasagna/backend/core/onion-layers';

/**
 * Base adapter for use cases that return void.
 *
 * Similar to BaseInboundAdapter but supports void output.
 */
export abstract class BaseVoidInboundAdapter<TInDto extends BaseDto<unknown>>
  implements BaseInboundPort<TInDto, void>
{
  protected abstract handle(input: TInDto): Promise<void>;

  public async execute(input: TInDto): Promise<void> {
    return wrapErrorUnlessAsync(
      () => this.handle(input),
      (cause) => new UseCaseError({ message: 'Unexpected use case handler error', cause }),
      [ObjectValidationError, UseCaseError, DomainError, InfraError],
    );
  }
}
