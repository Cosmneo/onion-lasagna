import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const getProjectEndpointMetadata: HttpEndpointMetadata = {
  id: 'get-project',
  shortId: 'gp',
  name: 'getProject',
  description: 'Gets a project by ID with all statuses and tasks.',
  path: '/{projectId}',
  method: 'GET',
  openApi: {
    summary: 'Get project by ID',
    successStatus: 200,
  },
};
