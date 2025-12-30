import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  UpdateProjectInputDto,
  type UpdateProjectInput,
} from '../../../../app/ports/inbound/projects/update-project.command.port';
import {
  type UpdateProjectRequestDto,
  UpdateProjectResponseDto,
  type UpdateProjectResponseData,
} from './dtos';

export function updateProjectToUseCaseMapper(
  request: UpdateProjectRequestDto,
  validator: DtoValidator<UpdateProjectInput>,
): UpdateProjectInputDto {
  return new UpdateProjectInputDto(
    {
      projectId: request.data.pathParams.projectId,
      name: request.data.body.name,
      description: request.data.body.description,
    },
    validator,
  );
}

export function updateProjectToResponseMapper(
  validator: DtoValidator<UpdateProjectResponseData>,
): UpdateProjectResponseDto {
  return new UpdateProjectResponseDto(
    {
      statusCode: 204,
      body: null,
    },
    validator,
  );
}
