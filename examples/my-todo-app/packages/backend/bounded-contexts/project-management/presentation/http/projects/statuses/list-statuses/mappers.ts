import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  ListStatusesInputDto,
  type ListStatusesInput,
  type ListStatusesOutputDto,
} from '../../../../../app/ports/inbound/statuses/list-statuses.query.port';
import {
  type ListStatusesRequestDto,
  ListStatusesResponseDto,
  type ListStatusesResponseData,
} from './dtos';

export function listStatusesToUseCaseMapper(
  request: ListStatusesRequestDto,
  validator: DtoValidator<ListStatusesInput>,
): ListStatusesInputDto {
  return new ListStatusesInputDto(
    {
      projectId: request.data.pathParams.projectId,
    },
    validator,
  );
}

export function listStatusesToResponseMapper(
  output: ListStatusesOutputDto,
  validator: DtoValidator<ListStatusesResponseData>,
): ListStatusesResponseDto {
  return new ListStatusesResponseDto(
    {
      statusCode: 200,
      body: {
        statuses: output.data.statuses,
      },
    },
    validator,
  );
}
