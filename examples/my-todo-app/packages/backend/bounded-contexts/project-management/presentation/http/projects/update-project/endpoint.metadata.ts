import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const updateProjectEndpointMetadata: HttpEndpointMetadata = {
  id: 'update-project',
  shortId: 'up',
  name: 'updateProject',
  description: 'Updates project name and/or description.',
  path: '/{projectId}',
  method: 'PATCH',
  openApi: {
    summary: 'Update a project',
    successStatus: 204,
  },
};
