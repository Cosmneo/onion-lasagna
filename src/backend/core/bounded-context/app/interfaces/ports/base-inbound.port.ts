import type { BaseDto } from '../../../../global/classes/based-dto.class';

export interface BaseInboundPort<TInput, TOutput> {
  execute(input: BaseDto<TInput>): Promise<BaseDto<TOutput>>;
}
