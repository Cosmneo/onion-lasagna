import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';

export interface UpdateTaskInput {
  projectId: string;
  taskId: string;
  title?: string;
  description?: string;
}

export class UpdateTaskInputDto extends BaseDto<UpdateTaskInput> {}

/**
 * Inbound port for UpdateTask command.
 *
 * Updates task title and/or description.
 */
export interface UpdateTaskPort
  extends BaseInboundPort<UpdateTaskInputDto, void> {}
