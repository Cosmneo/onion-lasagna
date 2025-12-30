import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const deleteStatusEndpointMetadata: HttpEndpointMetadata = {
  id: 'delete-status',
  shortId: 'ds',
  name: 'deleteStatus',
  description: 'Removes a status from a project.',
  path: '/{statusId}',
  method: 'DELETE',
  openApi: {
    summary: 'Delete a status',
    successStatus: 204,
  },
};
