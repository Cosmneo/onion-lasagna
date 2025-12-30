import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';

export interface DeleteProjectRequestData {
  pathParams: {
    projectId: string;
  };
}

export class DeleteProjectRequestDto extends BaseDto<DeleteProjectRequestData> {}

export interface DeleteProjectResponseData extends HttpResponse {
  body: null;
}

export class DeleteProjectResponseDto extends BaseDto<DeleteProjectResponseData> {}
