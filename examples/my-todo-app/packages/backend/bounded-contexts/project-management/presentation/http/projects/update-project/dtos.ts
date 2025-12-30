import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';

export interface UpdateProjectRequestData {
  pathParams: {
    projectId: string;
  };
  body: {
    name?: string;
    description?: string;
  };
}

export class UpdateProjectRequestDto extends BaseDto<UpdateProjectRequestData> {}

export interface UpdateProjectResponseData extends HttpResponse {
  body: null;
}

export class UpdateProjectResponseDto extends BaseDto<UpdateProjectResponseData> {}
