import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  DeleteProjectInputDto,
  type DeleteProjectInput,
} from '../../../../app/ports/inbound/projects/delete-project.command.port';
import {
  type DeleteProjectRequestDto,
  DeleteProjectResponseDto,
  type DeleteProjectResponseData,
} from './dtos';

export function deleteProjectToUseCaseMapper(
  request: DeleteProjectRequestDto,
  validator: DtoValidator<DeleteProjectInput>,
): DeleteProjectInputDto {
  return new DeleteProjectInputDto(
    {
      projectId: request.data.pathParams.projectId,
    },
    validator,
  );
}

export function deleteProjectToResponseMapper(
  validator: DtoValidator<DeleteProjectResponseData>,
): DeleteProjectResponseDto {
  return new DeleteProjectResponseDto(
    {
      statusCode: 204,
      body: null,
    },
    validator,
  );
}
