import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';

export interface DeleteTaskRequestData {
  pathParams: {
    projectId: string;
    taskId: string;
  };
}

export class DeleteTaskRequestDto extends BaseDto<DeleteTaskRequestData> {}

export interface DeleteTaskResponseData extends HttpResponse {
  body: null;
}

export class DeleteTaskResponseDto extends BaseDto<DeleteTaskResponseData> {}
