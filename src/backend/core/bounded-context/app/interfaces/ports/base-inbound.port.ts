import type { BaseDto } from '../../../../global/classes/base-dto.class';

export interface BaseInboundPort<TInput, TOutput> {
  execute(input: BaseDto<TInput>): Promise<BaseDto<TOutput>>;
}
