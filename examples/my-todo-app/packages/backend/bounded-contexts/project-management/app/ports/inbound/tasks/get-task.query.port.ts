import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { TaskDetailView } from '@repo/shared/read-models';

export interface GetTaskInput {
  projectId: string;
  taskId: string;
}

export type GetTaskOutput = TaskDetailView;

export class GetTaskInputDto extends BaseDto<GetTaskInput> {}

export class GetTaskOutputDto extends BaseDto<GetTaskOutput> {}

/**
 * Inbound port for GetTask query.
 *
 * Gets a single task by ID.
 */
export interface GetTaskPort
  extends BaseInboundPort<GetTaskInputDto, GetTaskOutputDto> {}
