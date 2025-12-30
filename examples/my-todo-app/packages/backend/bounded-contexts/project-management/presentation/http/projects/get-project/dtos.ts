import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';
import type { ProjectDetailView } from '@repo/shared/read-models';

export interface GetProjectRequestData {
  pathParams: {
    projectId: string;
  };
}

export class GetProjectRequestDto extends BaseDto<GetProjectRequestData> {}

export interface GetProjectResponseData extends HttpResponse {
  body: ProjectDetailView;
}

export class GetProjectResponseDto extends BaseDto<GetProjectResponseData> {}
