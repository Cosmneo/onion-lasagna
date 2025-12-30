import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  UpdateTaskInputDto,
  type UpdateTaskInput,
} from '../../../../../app/ports/inbound/tasks/update-task.command.port';
import {
  type UpdateTaskRequestDto,
  UpdateTaskResponseDto,
  type UpdateTaskResponseData,
} from './dtos';

export function updateTaskToUseCaseMapper(
  request: UpdateTaskRequestDto,
  validator: DtoValidator<UpdateTaskInput>,
): UpdateTaskInputDto {
  return new UpdateTaskInputDto(
    {
      projectId: request.data.pathParams.projectId,
      taskId: request.data.pathParams.taskId,
      title: request.data.body.title,
      description: request.data.body.description,
    },
    validator,
  );
}

export function updateTaskToResponseMapper(
  validator: DtoValidator<UpdateTaskResponseData>,
): UpdateTaskResponseDto {
  return new UpdateTaskResponseDto(
    {
      statusCode: 204,
      body: null,
    },
    validator,
  );
}
