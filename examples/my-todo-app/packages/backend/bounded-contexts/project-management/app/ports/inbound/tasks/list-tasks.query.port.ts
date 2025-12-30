import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto, type PaginatedData } from '@cosmneo/onion-lasagna/backend/core/global';
import type { TaskListItem } from '@repo/shared/read-models';

export interface ListTasksInput {
  projectId: string;
  page?: number;
  pageSize?: number;
}

export type ListTasksOutput = PaginatedData<TaskListItem>;

export class ListTasksInputDto extends BaseDto<ListTasksInput> {}

export class ListTasksOutputDto extends BaseDto<ListTasksOutput> {}

/**
 * Inbound port for ListTasks query.
 *
 * Lists all tasks in a project.
 */
export interface ListTasksPort
  extends BaseInboundPort<ListTasksInputDto, ListTasksOutputDto> {}
