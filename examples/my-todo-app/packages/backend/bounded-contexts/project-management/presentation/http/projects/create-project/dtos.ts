import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';

export interface CreateProjectRequestData {
  body: {
    name: string;
    description?: string;
  };
}

export class CreateProjectRequestDto extends BaseDto<CreateProjectRequestData> {}

export interface CreateProjectResponseData extends HttpResponse {
  body: {
    projectId: string;
  };
}

export class CreateProjectResponseDto extends BaseDto<CreateProjectResponseData> {}
