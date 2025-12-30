import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const listTasksByStatusEndpointMetadata: HttpEndpointMetadata = {
  id: 'list-tasks-by-status',
  shortId: 'ltbs',
  name: 'listTasksByStatus',
  description: 'Lists tasks filtered by status.',
  path: '/by-status/{statusId}',
  method: 'GET',
  openApi: {
    summary: 'List tasks by status',
    successStatus: 200,
  },
};
