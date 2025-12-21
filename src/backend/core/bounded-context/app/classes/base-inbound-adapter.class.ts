import type { BaseDto } from '../../../global/classes/based-dto.class';
import type { BaseInboundPort } from '../interfaces/ports/base-inbound.port';
import { UseCaseError } from '../exceptions/use-case.error';
import { DomainError } from '../../domain/exceptions/domain-error';
import { InfraError } from '../../infra/exceptions/infra.error';

export abstract class BaseInboundAdapter<
  TInput,
  TOutput,
  TInDto extends BaseDto<TInput> = BaseDto<TInput>,
  TOutDto extends BaseDto<TOutput> = BaseDto<TOutput>,
> implements BaseInboundPort<TInput, TOutput> {
  protected abstract handle(input: TInDto): Promise<TOutDto>;

  public async execute(input: BaseDto<TInput>): Promise<BaseDto<TOutput>> {
    try {
      return await this.handle(input as TInDto);
    } catch (error) {
      if (
        error instanceof UseCaseError ||
        error instanceof DomainError ||
        error instanceof InfraError
      ) {
        throw error;
      }
      throw new UseCaseError({
        message: 'Unexpected use case handler error',
        cause: error,
      });
    }
  }
}
