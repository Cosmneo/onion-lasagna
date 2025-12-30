import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';

export interface MoveTaskRequestData {
  pathParams: {
    projectId: string;
    taskId: string;
  };
  body: {
    statusId: string;
  };
}

export class MoveTaskRequestDto extends BaseDto<MoveTaskRequestData> {}

export interface MoveTaskResponseData extends HttpResponse {
  body: null;
}

export class MoveTaskResponseDto extends BaseDto<MoveTaskResponseData> {}
