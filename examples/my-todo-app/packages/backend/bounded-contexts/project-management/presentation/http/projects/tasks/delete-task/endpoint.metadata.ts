import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const deleteTaskEndpointMetadata: HttpEndpointMetadata = {
  id: 'delete-task',
  shortId: 'dt',
  name: 'deleteTask',
  description: 'Removes a task from a project.',
  path: '/{taskId}',
  method: 'DELETE',
  openApi: {
    summary: 'Delete a task',
    successStatus: 204,
  },
};
