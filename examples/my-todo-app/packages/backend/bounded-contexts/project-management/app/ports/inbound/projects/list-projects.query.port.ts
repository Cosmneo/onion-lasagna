import type { BaseInboundPort } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { BaseDto, type PaginatedData } from '@cosmneo/onion-lasagna/backend/core/global';
import type { ProjectListItem } from '@repo/shared/read-models';

export interface ListProjectsInput {
  page: number;
  pageSize: number;
}

export type ListProjectsOutput = PaginatedData<ProjectListItem>;

export class ListProjectsInputDto extends BaseDto<ListProjectsInput> {}

export class ListProjectsOutputDto extends BaseDto<ListProjectsOutput> {}

/**
 * Inbound port for ListProjects query.
 *
 * Lists all projects with pagination.
 */
export interface ListProjectsPort
  extends BaseInboundPort<ListProjectsInputDto, ListProjectsOutputDto> {}
