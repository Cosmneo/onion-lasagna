import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  CreateProjectInputDto,
  type CreateProjectInput,
  type CreateProjectOutputDto,
} from '../../../../app/ports/inbound/projects/create-project.command.port';
import {
  type CreateProjectRequestDto,
  CreateProjectResponseDto,
  type CreateProjectResponseData,
} from './dtos';

export function createProjectToUseCaseMapper(
  request: CreateProjectRequestDto,
  validator: DtoValidator<CreateProjectInput>,
): CreateProjectInputDto {
  return new CreateProjectInputDto(
    {
      name: request.data.body.name,
      description: request.data.body.description,
    },
    validator,
  );
}

export function createProjectToResponseMapper(
  output: CreateProjectOutputDto,
  validator: DtoValidator<CreateProjectResponseData>,
): CreateProjectResponseDto {
  return new CreateProjectResponseDto(
    {
      statusCode: 201,
      body: {
        projectId: output.data.projectId,
      },
    },
    validator,
  );
}
