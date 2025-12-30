import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const listTasksEndpointMetadata: HttpEndpointMetadata = {
  id: 'list-tasks',
  shortId: 'lt',
  name: 'listTasks',
  description: 'Lists all tasks in a project.',
  path: '/',
  method: 'GET',
  openApi: {
    summary: 'List project tasks',
    successStatus: 200,
  },
};
