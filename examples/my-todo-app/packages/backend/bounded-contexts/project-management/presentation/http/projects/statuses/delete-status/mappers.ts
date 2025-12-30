import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  DeleteStatusInputDto,
  type DeleteStatusInput,
} from '../../../../../app/ports/inbound/statuses/delete-status.command.port';
import {
  type DeleteStatusRequestDto,
  DeleteStatusResponseDto,
  type DeleteStatusResponseData,
} from './dtos';

export function deleteStatusToUseCaseMapper(
  request: DeleteStatusRequestDto,
  validator: DtoValidator<DeleteStatusInput>,
): DeleteStatusInputDto {
  return new DeleteStatusInputDto(
    {
      projectId: request.data.pathParams.projectId,
      statusId: request.data.pathParams.statusId,
    },
    validator,
  );
}

export function deleteStatusToResponseMapper(
  validator: DtoValidator<DeleteStatusResponseData>,
): DeleteStatusResponseDto {
  return new DeleteStatusResponseDto(
    {
      statusCode: 204,
      body: null,
    },
    validator,
  );
}
