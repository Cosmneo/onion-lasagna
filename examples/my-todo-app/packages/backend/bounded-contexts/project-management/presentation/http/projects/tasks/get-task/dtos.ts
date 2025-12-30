import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';
import type { TaskDetailView } from '@repo/shared/read-models';

export interface GetTaskRequestData {
  pathParams: {
    projectId: string;
    taskId: string;
  };
}

export class GetTaskRequestDto extends BaseDto<GetTaskRequestData> {}

export interface GetTaskResponseData extends HttpResponse {
  body: TaskDetailView;
}

export class GetTaskResponseDto extends BaseDto<GetTaskResponseData> {}
