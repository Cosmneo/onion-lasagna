import { BaseDto } from '@cosmneo/onion-lasagna/backend/core/global';
import type { HttpResponse } from '@cosmneo/onion-lasagna/backend/core/presentation';

export interface AddStatusRequestData {
  pathParams: {
    projectId: string;
  };
  body: {
    name: string;
    isFinal: boolean;
    order: number;
  };
}

export class AddStatusRequestDto extends BaseDto<AddStatusRequestData> {}

export interface AddStatusResponseData extends HttpResponse {
  body: {
    statusId: string;
  };
}

export class AddStatusResponseDto extends BaseDto<AddStatusResponseData> {}
