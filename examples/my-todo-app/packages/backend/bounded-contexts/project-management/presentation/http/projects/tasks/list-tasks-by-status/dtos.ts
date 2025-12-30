import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';
import type { TaskListItem } from '@repo/shared/read-models';

export interface ListTasksByStatusRequestData {
  pathParams: {
    projectId: string;
    statusId: string;
  };
  queryParams: {
    page?: string;
    pageSize?: string;
  };
}

export class ListTasksByStatusRequestDto extends BaseDto<ListTasksByStatusRequestData> {}

export interface ListTasksByStatusResponseData extends HttpResponse {
  body: {
    items: TaskListItem[];
    total: number;
  };
}

export class ListTasksByStatusResponseDto extends BaseDto<ListTasksByStatusResponseData> {}
