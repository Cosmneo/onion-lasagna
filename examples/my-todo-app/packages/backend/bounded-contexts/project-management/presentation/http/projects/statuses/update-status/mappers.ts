import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  UpdateStatusInputDto,
  type UpdateStatusInput,
} from '../../../../../app/ports/inbound/statuses/update-status.command.port';
import {
  type UpdateStatusRequestDto,
  UpdateStatusResponseDto,
  type UpdateStatusResponseData,
} from './dtos';

export function updateStatusToUseCaseMapper(
  request: UpdateStatusRequestDto,
  validator: DtoValidator<UpdateStatusInput>,
): UpdateStatusInputDto {
  return new UpdateStatusInputDto(
    {
      projectId: request.data.pathParams.projectId,
      statusId: request.data.pathParams.statusId,
      name: request.data.body.name,
      isFinal: request.data.body.isFinal,
      order: request.data.body.order,
    },
    validator,
  );
}

export function updateStatusToResponseMapper(
  validator: DtoValidator<UpdateStatusResponseData>,
): UpdateStatusResponseDto {
  return new UpdateStatusResponseDto(
    {
      statusCode: 204,
      body: null,
    },
    validator,
  );
}
