import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const updateTaskEndpointMetadata: HttpEndpointMetadata = {
  id: 'update-task',
  shortId: 'ut',
  name: 'updateTask',
  description: 'Updates task title and/or description.',
  path: '/{taskId}',
  method: 'PATCH',
  openApi: {
    summary: 'Update a task',
    successStatus: 204,
  },
};
