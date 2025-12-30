import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';
import type { ProjectListItem } from '@repo/shared/read-models';

export interface ListProjectsRequestData {
  queryParams: {
    page?: string;
    pageSize?: string;
  };
}

export class ListProjectsRequestDto extends BaseDto<ListProjectsRequestData> {}

export interface ListProjectsResponseData extends HttpResponse {
  body: {
    items: ProjectListItem[];
    total: number;
  };
}

export class ListProjectsResponseDto extends BaseDto<ListProjectsResponseData> {}
