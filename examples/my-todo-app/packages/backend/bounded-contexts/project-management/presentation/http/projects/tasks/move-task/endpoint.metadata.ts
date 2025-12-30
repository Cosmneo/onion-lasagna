import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const moveTaskEndpointMetadata: HttpEndpointMetadata = {
  id: 'move-task',
  shortId: 'mt',
  name: 'moveTask',
  description: 'Moves a task to a different status.',
  path: '/{taskId}/move',
  method: 'PATCH',
  openApi: {
    summary: 'Move task to status',
    successStatus: 204,
  },
};
