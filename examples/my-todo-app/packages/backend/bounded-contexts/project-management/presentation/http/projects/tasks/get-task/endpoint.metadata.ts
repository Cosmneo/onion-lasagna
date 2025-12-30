import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const getTaskEndpointMetadata: HttpEndpointMetadata = {
  id: 'get-task',
  shortId: 'gt',
  name: 'getTask',
  description: 'Gets a single task by ID.',
  path: '/{taskId}',
  method: 'GET',
  openApi: {
    summary: 'Get task by ID',
    successStatus: 200,
  },
};
