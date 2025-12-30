import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const updateStatusEndpointMetadata: HttpEndpointMetadata = {
  id: 'update-status',
  shortId: 'us',
  name: 'updateStatus',
  description: 'Updates an existing status.',
  path: '/{statusId}',
  method: 'PATCH',
  openApi: {
    summary: 'Update a status',
    successStatus: 204,
  },
};
