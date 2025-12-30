import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';
import type { TaskListItem } from '@repo/shared/read-models';

export interface ListTasksRequestData {
  pathParams: {
    projectId: string;
  };
  queryParams: {
    page?: string;
    pageSize?: string;
  };
}

export class ListTasksRequestDto extends BaseDto<ListTasksRequestData> {}

export interface ListTasksResponseData extends HttpResponse {
  body: {
    items: TaskListItem[];
    total: number;
  };
}

export class ListTasksResponseDto extends BaseDto<ListTasksResponseData> {}
