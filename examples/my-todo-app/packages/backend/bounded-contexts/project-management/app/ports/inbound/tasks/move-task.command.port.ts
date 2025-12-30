import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';

export interface MoveTaskInput {
  projectId: string;
  taskId: string;
  statusId: string;
}

export class MoveTaskInputDto extends BaseDto<MoveTaskInput> {}

/**
 * Inbound port for MoveTask command.
 *
 * Moves a task to a different status.
 */
export interface MoveTaskPort extends BaseInboundPort<MoveTaskInputDto, void> {}
