import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  GetTaskInputDto,
  type GetTaskInput,
  type GetTaskOutputDto,
} from '../../../../../app/ports/inbound/tasks/get-task.query.port';
import {
  type GetTaskRequestDto,
  GetTaskResponseDto,
  type GetTaskResponseData,
} from './dtos';

export function getTaskToUseCaseMapper(
  request: GetTaskRequestDto,
  validator: DtoValidator<GetTaskInput>,
): GetTaskInputDto {
  return new GetTaskInputDto(
    {
      projectId: request.data.pathParams.projectId,
      taskId: request.data.pathParams.taskId,
    },
    validator,
  );
}

export function getTaskToResponseMapper(
  output: GetTaskOutputDto,
  validator: DtoValidator<GetTaskResponseData>,
): GetTaskResponseDto {
  return new GetTaskResponseDto(
    {
      statusCode: 200,
      body: output.data,
    },
    validator,
  );
}
