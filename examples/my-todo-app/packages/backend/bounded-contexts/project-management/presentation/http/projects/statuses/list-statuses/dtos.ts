import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';
import type { StatusListItem } from '@repo/shared/read-models';

export interface ListStatusesRequestData {
  pathParams: {
    projectId: string;
  };
}

export class ListStatusesRequestDto extends BaseDto<ListStatusesRequestData> {}

export interface ListStatusesResponseData extends HttpResponse {
  body: {
    statuses: StatusListItem[];
  };
}

export class ListStatusesResponseDto extends BaseDto<ListStatusesResponseData> {}
