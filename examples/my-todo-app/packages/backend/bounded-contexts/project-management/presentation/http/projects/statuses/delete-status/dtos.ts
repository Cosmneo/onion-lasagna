import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';

export interface DeleteStatusRequestData {
  pathParams: {
    projectId: string;
    statusId: string;
  };
}

export class DeleteStatusRequestDto extends BaseDto<DeleteStatusRequestData> {}

export interface DeleteStatusResponseData extends HttpResponse {
  body: null;
}

export class DeleteStatusResponseDto extends BaseDto<DeleteStatusResponseData> {}
