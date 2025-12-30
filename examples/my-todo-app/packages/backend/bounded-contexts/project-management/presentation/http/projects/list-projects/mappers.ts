import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  ListProjectsInputDto,
  type ListProjectsInput,
  type ListProjectsOutputDto,
} from '../../../../app/ports/inbound/projects/list-projects.query.port';
import {
  type ListProjectsRequestDto,
  ListProjectsResponseDto,
  type ListProjectsResponseData,
} from './dtos';

export function listProjectsToUseCaseMapper(
  request: ListProjectsRequestDto,
  validator: DtoValidator<ListProjectsInput>,
): ListProjectsInputDto {
  return new ListProjectsInputDto(
    {
      page: request.data.queryParams?.page ? parseInt(request.data.queryParams.page, 10) : 1,
      pageSize: request.data.queryParams?.pageSize ? parseInt(request.data.queryParams.pageSize, 10) : 20,
    },
    validator,
  );
}

export function listProjectsToResponseMapper(
  output: ListProjectsOutputDto,
  validator: DtoValidator<ListProjectsResponseData>,
): ListProjectsResponseDto {
  return new ListProjectsResponseDto(
    {
      statusCode: 200,
      body: {
        items: output.data.items,
        total: output.data.total,
      },
    },
    validator,
  );
}
