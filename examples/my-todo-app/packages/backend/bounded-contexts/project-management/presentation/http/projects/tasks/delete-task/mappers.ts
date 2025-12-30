import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  DeleteTaskInputDto,
  type DeleteTaskInput,
} from '../../../../../app/ports/inbound/tasks/delete-task.command.port';
import {
  type DeleteTaskRequestDto,
  DeleteTaskResponseDto,
  type DeleteTaskResponseData,
} from './dtos';

export function deleteTaskToUseCaseMapper(
  request: DeleteTaskRequestDto,
  validator: DtoValidator<DeleteTaskInput>,
): DeleteTaskInputDto {
  return new DeleteTaskInputDto(
    {
      projectId: request.data.pathParams.projectId,
      taskId: request.data.pathParams.taskId,
    },
    validator,
  );
}

export function deleteTaskToResponseMapper(
  validator: DtoValidator<DeleteTaskResponseData>,
): DeleteTaskResponseDto {
  return new DeleteTaskResponseDto(
    {
      statusCode: 204,
      body: null,
    },
    validator,
  );
}
