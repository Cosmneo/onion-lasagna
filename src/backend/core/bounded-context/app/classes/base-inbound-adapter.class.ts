import type { BaseDto } from '../../../global/classes/base-dto.class';
import type { BaseInboundPort } from '../interfaces/ports/base-inbound.port';
import { UseCaseError } from '../exceptions/use-case.error';
import { DomainError } from '../../domain/exceptions/domain-error';
import { InfraError } from '../../infra/exceptions/infra.error';

export abstract class BaseInboundAdapter<
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> implements BaseInboundPort<TInDto, TOutDto>
{
  protected abstract handle(input: TInDto): Promise<TOutDto>;

  public async execute(input: TInDto): Promise<TOutDto> {
    try {
      return await this.handle(input);
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
