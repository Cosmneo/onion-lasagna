import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  MoveTaskInputDto,
  type MoveTaskInput,
} from '../../../../../app/ports/inbound/tasks/move-task.command.port';
import {
  type MoveTaskRequestDto,
  MoveTaskResponseDto,
  type MoveTaskResponseData,
} from './dtos';

export function moveTaskToUseCaseMapper(
  request: MoveTaskRequestDto,
  validator: DtoValidator<MoveTaskInput>,
): MoveTaskInputDto {
  return new MoveTaskInputDto(
    {
      projectId: request.data.pathParams.projectId,
      taskId: request.data.pathParams.taskId,
      statusId: request.data.body.statusId,
    },
    validator,
  );
}

export function moveTaskToResponseMapper(
  validator: DtoValidator<MoveTaskResponseData>,
): MoveTaskResponseDto {
  return new MoveTaskResponseDto(
    {
      statusCode: 204,
      body: null,
    },
    validator,
  );
}
