import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';

export interface UpdateTaskRequestData {
  pathParams: {
    projectId: string;
    taskId: string;
  };
  body: {
    title?: string;
    description?: string;
  };
}

export class UpdateTaskRequestDto extends BaseDto<UpdateTaskRequestData> {}

export interface UpdateTaskResponseData extends HttpResponse {
  body: null;
}

export class UpdateTaskResponseDto extends BaseDto<UpdateTaskResponseData> {}
