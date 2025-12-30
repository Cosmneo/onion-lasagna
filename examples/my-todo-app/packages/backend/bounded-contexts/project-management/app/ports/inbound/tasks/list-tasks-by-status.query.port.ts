import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto, type PaginatedData } from '@cosmneo/onion-lasagna/backend/core/global';
import type { TaskListItem } from '@repo/shared/read-models';

export interface ListTasksByStatusInput {
  projectId: string;
  statusId: string;
  page?: number;
  pageSize?: number;
}

export type ListTasksByStatusOutput = PaginatedData<TaskListItem>;

export class ListTasksByStatusInputDto extends BaseDto<ListTasksByStatusInput> {}

export class ListTasksByStatusOutputDto extends BaseDto<ListTasksByStatusOutput> {}

/**
 * Inbound port for ListTasksByStatus query.
 *
 * Lists tasks filtered by status.
 */
export interface ListTasksByStatusPort
  extends BaseInboundPort<ListTasksByStatusInputDto, ListTasksByStatusOutputDto> {}
