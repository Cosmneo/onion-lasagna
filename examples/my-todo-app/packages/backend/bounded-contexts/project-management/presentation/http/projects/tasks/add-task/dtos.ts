import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';

export interface AddTaskRequestData {
  pathParams: {
    projectId: string;
  };
  body: {
    title: string;
    statusId?: string;
    description?: string;
  };
}

export class AddTaskRequestDto extends BaseDto<AddTaskRequestData> {}

export interface AddTaskResponseData extends HttpResponse {
  body: {
    taskId: string;
  };
}

export class AddTaskResponseDto extends BaseDto<AddTaskResponseData> {}
