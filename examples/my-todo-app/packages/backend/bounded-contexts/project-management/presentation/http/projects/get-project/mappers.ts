import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  GetProjectInputDto,
  type GetProjectInput,
  type GetProjectOutputDto,
} from '../../../../app/ports/inbound/projects/get-project.query.port';
import {
  type GetProjectRequestDto,
  GetProjectResponseDto,
  type GetProjectResponseData,
} from './dtos';

export function getProjectToUseCaseMapper(
  request: GetProjectRequestDto,
  validator: DtoValidator<GetProjectInput>,
): GetProjectInputDto {
  return new GetProjectInputDto(
    {
      projectId: request.data.pathParams.projectId,
    },
    validator,
  );
}

export function getProjectToResponseMapper(
  output: GetProjectOutputDto,
  validator: DtoValidator<GetProjectResponseData>,
): GetProjectResponseDto {
  return new GetProjectResponseDto(
    {
      statusCode: 200,
      body: output.data,
    },
    validator,
  );
}
