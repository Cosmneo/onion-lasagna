import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';

export interface UpdateStatusRequestData {
  pathParams: {
    projectId: string;
    statusId: string;
  };
  body: {
    name?: string;
    isFinal?: boolean;
    order?: number;
  };
}

export class UpdateStatusRequestDto extends BaseDto<UpdateStatusRequestData> {}

export interface UpdateStatusResponseData extends HttpResponse {
  body: null;
}

export class UpdateStatusResponseDto extends BaseDto<UpdateStatusResponseData> {}
