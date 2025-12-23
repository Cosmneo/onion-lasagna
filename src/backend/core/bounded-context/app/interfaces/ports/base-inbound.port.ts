import type { BaseDto } from '../../../../global/classes/base-dto.class';

export interface BaseInboundPort<
  TInDto extends BaseDto<unknown>,
  TOutDto extends BaseDto<unknown>,
> {
  execute(input: TInDto): Promise<TOutDto>;
}
