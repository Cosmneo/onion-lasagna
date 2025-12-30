import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';

// Project schemas
import {
  createProjectRequestSchema,
  createProjectResponseSchema,
} from '../infra/schemas/http/projects/create-project.schemas';
import {
  listProjectsRequestSchema,
  listProjectsResponseSchema,
} from '../infra/schemas/http/projects/list-projects.schemas';
import {
  getProjectRequestSchema,
  getProjectResponseSchema,
} from '../infra/schemas/http/projects/get-project.schemas';
import { updateProjectRequestSchema } from '../infra/schemas/http/projects/update-project.schemas';
import { deleteProjectRequestSchema } from '../infra/schemas/http/projects/delete-project.schemas';

// Status schemas
import {
  addStatusRequestSchema,
  addStatusResponseSchema,
} from '../infra/schemas/http/statuses/add-status.schemas';
import {
  listStatusesRequestSchema,
  listStatusesResponseSchema,
} from '../infra/schemas/http/statuses/list-statuses.schemas';
import { updateStatusRequestSchema } from '../infra/schemas/http/statuses/update-status.schemas';
import { deleteStatusRequestSchema } from '../infra/schemas/http/statuses/delete-status.schemas';

// Task schemas
import {
  addTaskRequestSchema,
  addTaskResponseSchema,
} from '../infra/schemas/http/tasks/add-task.schemas';
import {
  listTasksRequestSchema,
  listTasksResponseSchema,
} from '../infra/schemas/http/tasks/list-tasks.schemas';
import {
  getTaskRequestSchema,
  getTaskResponseSchema,
} from '../infra/schemas/http/tasks/get-task.schemas';
import { updateTaskRequestSchema } from '../infra/schemas/http/tasks/update-task.schemas';
import { moveTaskRequestSchema } from '../infra/schemas/http/tasks/move-task.schemas';
import { deleteTaskRequestSchema } from '../infra/schemas/http/tasks/delete-task.schemas';
import {
  listTasksByStatusRequestSchema,
  listTasksByStatusResponseSchema,
} from '../infra/schemas/http/tasks/list-tasks-by-status.schemas';

// Project validators
export const createProjectRequestValidator = createZodValidator(createProjectRequestSchema);
export const createProjectResponseValidator = createZodValidator(createProjectResponseSchema);
export const listProjectsRequestValidator = createZodValidator(listProjectsRequestSchema);
export const listProjectsResponseValidator = createZodValidator(listProjectsResponseSchema);
export const getProjectRequestValidator = createZodValidator(getProjectRequestSchema);
export const getProjectResponseValidator = createZodValidator(getProjectResponseSchema);
export const updateProjectRequestValidator = createZodValidator(updateProjectRequestSchema);
export const deleteProjectRequestValidator = createZodValidator(deleteProjectRequestSchema);

// Status validators
export const addStatusRequestValidator = createZodValidator(addStatusRequestSchema);
export const addStatusResponseValidator = createZodValidator(addStatusResponseSchema);
export const listStatusesRequestValidator = createZodValidator(listStatusesRequestSchema);
export const listStatusesResponseValidator = createZodValidator(listStatusesResponseSchema);
export const updateStatusRequestValidator = createZodValidator(updateStatusRequestSchema);
export const deleteStatusRequestValidator = createZodValidator(deleteStatusRequestSchema);

// Task validators
export const addTaskRequestValidator = createZodValidator(addTaskRequestSchema);
export const addTaskResponseValidator = createZodValidator(addTaskResponseSchema);
export const listTasksRequestValidator = createZodValidator(listTasksRequestSchema);
export const listTasksResponseValidator = createZodValidator(listTasksResponseSchema);
export const getTaskRequestValidator = createZodValidator(getTaskRequestSchema);
export const getTaskResponseValidator = createZodValidator(getTaskResponseSchema);
export const updateTaskRequestValidator = createZodValidator(updateTaskRequestSchema);
export const moveTaskRequestValidator = createZodValidator(moveTaskRequestSchema);
export const deleteTaskRequestValidator = createZodValidator(deleteTaskRequestSchema);
export const listTasksByStatusRequestValidator = createZodValidator(listTasksByStatusRequestSchema);
export const listTasksByStatusResponseValidator = createZodValidator(listTasksByStatusResponseSchema);
