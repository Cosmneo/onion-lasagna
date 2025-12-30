import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const addTaskEndpointMetadata: HttpEndpointMetadata = {
  id: 'add-task',
  shortId: 'at',
  name: 'addTask',
  description: 'Creates a new task in a project.',
  path: '/',
  method: 'POST',
  openApi: {
    summary: 'Add a task to project',
    successStatus: 201,
  },
};
