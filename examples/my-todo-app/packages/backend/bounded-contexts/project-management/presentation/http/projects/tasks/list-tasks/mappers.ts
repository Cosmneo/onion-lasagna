import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  ListTasksInputDto,
  type ListTasksInput,
  type ListTasksOutputDto,
} from '../../../../../app/ports/inbound/tasks/list-tasks.query.port';
import {
  type ListTasksRequestDto,
  ListTasksResponseDto,
  type ListTasksResponseData,
} from './dtos';

export function listTasksToUseCaseMapper(
  request: ListTasksRequestDto,
  validator: DtoValidator<ListTasksInput>,
): ListTasksInputDto {
  return new ListTasksInputDto(
    {
      projectId: request.data.pathParams.projectId,
      page: request.data.queryParams.page ? parseInt(request.data.queryParams.page, 10) : undefined,
      pageSize: request.data.queryParams.pageSize ? parseInt(request.data.queryParams.pageSize, 10) : undefined,
    },
    validator,
  );
}

export function listTasksToResponseMapper(
  output: ListTasksOutputDto,
  validator: DtoValidator<ListTasksResponseData>,
): ListTasksResponseDto {
  return new ListTasksResponseDto(
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
