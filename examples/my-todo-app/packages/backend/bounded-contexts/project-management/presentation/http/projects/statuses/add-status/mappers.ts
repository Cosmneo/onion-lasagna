import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  AddStatusInputDto,
  type AddStatusInput,
  type AddStatusOutputDto,
} from '../../../../../app/ports/inbound/statuses/add-status.command.port';
import {
  type AddStatusRequestDto,
  AddStatusResponseDto,
  type AddStatusResponseData,
} from './dtos';

export function addStatusToUseCaseMapper(
  request: AddStatusRequestDto,
  validator: DtoValidator<AddStatusInput>,
): AddStatusInputDto {
  return new AddStatusInputDto(
    {
      projectId: request.data.pathParams.projectId,
      name: request.data.body.name,
      isFinal: request.data.body.isFinal,
      order: request.data.body.order,
    },
    validator,
  );
}

export function addStatusToResponseMapper(
  output: AddStatusOutputDto,
  validator: DtoValidator<AddStatusResponseData>,
): AddStatusResponseDto {
  return new AddStatusResponseDto(
    {
      statusCode: 201,
      body: {
        statusId: output.data.statusId,
      },
    },
    validator,
  );
}
