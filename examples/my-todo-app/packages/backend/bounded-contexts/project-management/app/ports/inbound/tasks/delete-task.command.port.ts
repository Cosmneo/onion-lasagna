import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';

export interface DeleteTaskInput {
  projectId: string;
  taskId: string;
}

export class DeleteTaskInputDto extends BaseDto<DeleteTaskInput> {}

/**
 * Inbound port for DeleteTask command.
 *
 * Removes a task from a project.
 */
export interface DeleteTaskPort extends BaseInboundPort<DeleteTaskInputDto, void> {}
