import type { DtoValidator } from '@cosmneo/onion-lasagna/backend/core/global';
import {
  AddTaskInputDto,
  type AddTaskInput,
  type AddTaskOutputDto,
} from '../../../../../app/ports/inbound/tasks/add-task.command.port';
import {
  type AddTaskRequestDto,
  AddTaskResponseDto,
  type AddTaskResponseData,
} from './dtos';

export function addTaskToUseCaseMapper(
  request: AddTaskRequestDto,
  validator: DtoValidator<AddTaskInput>,
): AddTaskInputDto {
  return new AddTaskInputDto(
    {
      projectId: request.data.pathParams.projectId,
      title: request.data.body.title,
      statusId: request.data.body.statusId,
      description: request.data.body.description,
    },
    validator,
  );
}

export function addTaskToResponseMapper(
  output: AddTaskOutputDto,
  validator: DtoValidator<AddTaskResponseData>,
): AddTaskResponseDto {
  return new AddTaskResponseDto(
    {
      statusCode: 201,
      body: {
        taskId: output.data.taskId,
      },
    },
    validator,
  );
}
