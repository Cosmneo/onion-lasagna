import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  ListTasksByStatusInputDto,
  type ListTasksByStatusInput,
  type ListTasksByStatusOutputDto,
} from '../../../../../app/ports/inbound/tasks/list-tasks-by-status.query.port';
import {
  type ListTasksByStatusRequestDto,
  ListTasksByStatusResponseDto,
  type ListTasksByStatusResponseData,
} from './dtos';

export function listTasksByStatusToUseCaseMapper(
  request: ListTasksByStatusRequestDto,
  validator: DtoValidator<ListTasksByStatusInput>,
): ListTasksByStatusInputDto {
  return new ListTasksByStatusInputDto(
    {
      projectId: request.data.pathParams.projectId,
      statusId: request.data.pathParams.statusId,
      page: request.data.queryParams.page ? parseInt(request.data.queryParams.page, 10) : undefined,
      pageSize: request.data.queryParams.pageSize ? parseInt(request.data.queryParams.pageSize, 10) : undefined,
    },
    validator,
  );
}

export function listTasksByStatusToResponseMapper(
  output: ListTasksByStatusOutputDto,
  validator: DtoValidator<ListTasksByStatusResponseData>,
): ListTasksByStatusResponseDto {
  return new ListTasksByStatusResponseDto(
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
