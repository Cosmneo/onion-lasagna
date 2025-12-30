import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';

export interface AddTaskInput {
  projectId: string;
  title: string;
  statusId?: string;
  description?: string;
}

export interface AddTaskOutput {
  taskId: string;
}

export class AddTaskInputDto extends BaseDto<AddTaskInput> {}

export class AddTaskOutputDto extends BaseDto<AddTaskOutput> {}

/**
 * Inbound port for AddTask command.
 *
 * Creates a new task in a project.
 */
export interface AddTaskPort
  extends BaseInboundPort<AddTaskInputDto, AddTaskOutputDto> {}
