import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const deleteProjectEndpointMetadata: HttpEndpointMetadata = {
  id: 'delete-project',
  shortId: 'dp',
  name: 'deleteProject',
  description: 'Deletes a project and all its tasks/statuses.',
  path: '/{projectId}',
  method: 'DELETE',
  openApi: {
    summary: 'Delete a project',
    successStatus: 204,
  },
};
