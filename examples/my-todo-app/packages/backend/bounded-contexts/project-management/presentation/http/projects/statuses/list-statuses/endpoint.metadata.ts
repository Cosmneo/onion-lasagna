import type { HttpEndpointMetadata } from '@cosmneo/onion-lasagna/backend/core/presentation';

export const listStatusesEndpointMetadata: HttpEndpointMetadata = {
  id: 'list-statuses',
  shortId: 'ls',
  name: 'listStatuses',
  description: 'Lists all statuses in a project.',
  path: '/',
  method: 'GET',
  openApi: {
    summary: 'List project statuses',
    successStatus: 200,
  },
};
